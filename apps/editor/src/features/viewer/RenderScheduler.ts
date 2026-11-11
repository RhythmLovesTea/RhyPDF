import { BitmapLruCache } from './BitmapLruCache';
import { PdfError } from '@rhypdf/pdf-engine';

export enum RenderPriority {
  VISIBLE = 100,
  NEAR = 50,
  THUMBNAIL = 10,
  BACKGROUND = 1
}

export interface RenderJobRequest {
  id: string;
  pageIndex: number;
  priority: RenderPriority;
  render: (signal: AbortSignal) => Promise<ImageBitmap>;
}

interface QueuedJob {
  request: RenderJobRequest;
  abortController: AbortController;
  resolve: (bitmap: ImageBitmap) => void;
  reject: (err: unknown) => void;
}

interface ActiveJob {
  request: RenderJobRequest;
  abortController: AbortController;
}

export interface RenderSchedulerOptions {
  maxConcurrency?: number;
  cache?: BitmapLruCache;
}

export class RenderScheduler {
  private queue: QueuedJob[] = [];
  private activeJobs = new Map<string, ActiveJob>();
  private maxConcurrency: number;
  private cache?: BitmapLruCache;

  private completedCount = 0;
  private cancelledCount = 0;

  constructor(options?: RenderSchedulerOptions) {
    this.maxConcurrency = options?.maxConcurrency ?? 2;
    this.cache = options?.cache;
  }

  /**
   * Schedule a render job. If already cached, returns immediately.
   */
  async schedule(request: RenderJobRequest): Promise<ImageBitmap> {
    // 1. Check cache first
    if (this.cache?.has(request.id)) {
      const cached = this.cache.get(request.id);
      if (cached) return cached;
    }

    // 2. Check if identical job is already queued; if so, upgrade priority if higher
    const existingQueued = this.queue.find((j) => j.request.id === request.id);
    if (existingQueued) {
      if (request.priority > existingQueued.request.priority) {
        existingQueued.request.priority = request.priority;
        this.sortQueue();
      }
      return new Promise<ImageBitmap>((resolve, reject) => {
        const originalResolve = existingQueued.resolve;
        const originalReject = existingQueued.reject;
        existingQueued.resolve = (bmp) => {
          originalResolve(bmp);
          resolve(bmp);
        };
        existingQueued.reject = (err) => {
          originalReject(err);
          reject(err);
        };
      });
    }

    return new Promise<ImageBitmap>((resolve, reject) => {
      const abortController = new AbortController();
      const queuedJob: QueuedJob = {
        request,
        abortController,
        resolve,
        reject
      };

      this.queue.push(queuedJob);
      this.sortQueue();
      this.processNext();
    });
  }

  /**
   * Cancel stale jobs during fast scroll.
   * Any queued or running job whose pageIndex is NOT in the activePages set is aborted.
   */
  cancelStaleJobs(activePages: Set<number>): number {
    let cancelled = 0;

    // 1. Cancel queued jobs that are not active
    const retainedQueue: QueuedJob[] = [];
    for (const job of this.queue) {
      if (!activePages.has(job.request.pageIndex)) {
        job.abortController.abort();
        job.reject(new PdfError('Cancelled', `Render job ${job.request.id} cancelled (stale)`));
        this.cancelledCount++;
        cancelled++;
      } else {
        retainedQueue.push(job);
      }
    }
    this.queue = retainedQueue;

    // 2. Cancel active running jobs if they are no longer in activePages
    for (const [id, active] of this.activeJobs) {
      if (!activePages.has(active.request.pageIndex)) {
        active.abortController.abort();
        this.activeJobs.delete(id);
        this.cancelledCount++;
        cancelled++;
      }
    }

    // Process queue in case slots freed up
    this.processNext();
    return cancelled;
  }

  /**
   * Cancel a specific job by id
   */
  cancelJob(id: string): boolean {
    const queueIdx = this.queue.findIndex((j) => j.request.id === id);
    if (queueIdx !== -1) {
      const job = this.queue.splice(queueIdx, 1)[0];
      if (job) {
        job.abortController.abort();
        job.reject(new PdfError('Cancelled', `Render job ${id} was explicitly cancelled`));
        this.cancelledCount++;
        return true;
      }
    }

    const active = this.activeJobs.get(id);
    if (active) {
      active.abortController.abort();
      this.activeJobs.delete(id);
      this.cancelledCount++;
      this.processNext();
      return true;
    }

    return false;
  }

  private sortQueue(): void {
    // Sort descending by priority (VISIBLE=100 > NEAR=50 > THUMBNAIL=10 > BACKGROUND=1)
    this.queue.sort((a, b) => b.request.priority - a.request.priority);
  }

  private processNext(): void {
    if (this.activeJobs.size >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    if (job.abortController.signal.aborted) {
      job.reject(new PdfError('Cancelled', `Render job ${job.request.id} already aborted`));
      this.processNext();
      return;
    }

    this.activeJobs.set(job.request.id, {
      request: job.request,
      abortController: job.abortController
    });

    job.request
      .render(job.abortController.signal)
      .then((bitmap) => {
        this.activeJobs.delete(job.request.id);
        if (job.abortController.signal.aborted) {
          if (typeof bitmap?.close === 'function') {
            try {
              bitmap.close();
            } catch {
              // ignore
            }
          }
          job.reject(new PdfError('Cancelled', `Job ${job.request.id} cancelled during execution`));
        } else {
          this.completedCount++;
          if (this.cache) {
            this.cache.put(job.request.id, bitmap);
          }
          job.resolve(bitmap);
        }
        this.processNext();
      })
      .catch((err) => {
        this.activeJobs.delete(job.request.id);
        if (job.abortController.signal.aborted) {
          this.cancelledCount++;
          job.reject(new PdfError('Cancelled', `Job ${job.request.id} cancelled during execution`));
        } else {
          job.reject(err);
        }
        this.processNext();
      });
  }

  getStats(): {
    queued: number;
    active: number;
    completed: number;
    cancelled: number;
  } {
    return {
      queued: this.queue.length,
      active: this.activeJobs.size,
      completed: this.completedCount,
      cancelled: this.cancelledCount
    };
  }

  clear(): void {
    for (const job of this.queue) {
      job.abortController.abort();
      job.reject(new PdfError('Cancelled', 'RenderScheduler cleared'));
    }
    for (const [, active] of this.activeJobs) {
      active.abortController.abort();
    }
    this.queue = [];
    this.activeJobs.clear();
  }
}
