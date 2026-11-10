import { describe, it, expect, vi } from 'vitest';
import { RenderScheduler, RenderPriority } from '../../src/features/viewer/RenderScheduler';
import { BitmapLruCache } from '../../src/features/viewer/BitmapLruCache';
import { PdfError } from '@rhypdf/pdf-engine';

function createMockBitmap(): ImageBitmap {
  return {
    width: 100,
    height: 100,
    close: vi.fn()
  } as unknown as ImageBitmap;
}

describe('Task 3.6: Render scheduler with priority queue and fast scroll cancellation', () => {
  it('executes higher priority jobs before lower priority jobs (VISIBLE > NEAR > THUMBNAIL)', async () => {
    const executionOrder: string[] = [];
    const scheduler = new RenderScheduler({ maxConcurrency: 1 });

    const createJob = (id: string, priority: RenderPriority) => ({
      id,
      pageIndex: 0,
      priority,
      render: async () => {
        executionOrder.push(id);
        return createMockBitmap();
      }
    });

    // Schedule thumbnail (priority 10) first, then visible (priority 100), then near (priority 50)
    const pThumb = scheduler.schedule(createJob('thumb-1', RenderPriority.THUMBNAIL));
    const pVisible = scheduler.schedule(createJob('visible-1', RenderPriority.VISIBLE));
    const pNear = scheduler.schedule(createJob('near-1', RenderPriority.NEAR));

    await Promise.all([pThumb, pVisible, pNear]);

    // Because thumb-1 was scheduled first into an idle scheduler (maxConcurrency=1), it started immediately.
    // While thumb-1 ran, both visible-1 and near-1 were queued.
    // The scheduler MUST pick visible-1 before near-1!
    expect(executionOrder[0]).toBe('thumb-1');
    expect(executionOrder[1]).toBe('visible-1');
    expect(executionOrder[2]).toBe('near-1');
  });

  it('cancels stale queued and active jobs on fast scroll', async () => {
    const scheduler = new RenderScheduler({ maxConcurrency: 1 });

    // Job 1 (running)
    const p1 = scheduler.schedule({
      id: 'page-1',
      pageIndex: 1,
      priority: RenderPriority.VISIBLE,
      render: async (signal) => {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new PdfError('Cancelled', 'aborted')));
          setTimeout(() => resolve(createMockBitmap()), 100);
        });
      }
    });

    // Job 2 (queued)
    const p2 = scheduler.schedule({
      id: 'page-2',
      pageIndex: 2,
      priority: RenderPriority.NEAR,
      render: async () => createMockBitmap()
    });

    // User fast scrolls away to page 50!
    // Stale pages: 1 and 2 are no longer active.
    const activePages = new Set([50, 51]);
    const cancelledCount = scheduler.cancelStaleJobs(activePages);

    expect(cancelledCount).toBeGreaterThanOrEqual(1);

    // Both promises should reject with Cancelled error
    await expect(p1).rejects.toMatchObject({ code: 'Cancelled' });
    await expect(p2).rejects.toMatchObject({ code: 'Cancelled' });
  });

  it('serves cached bitmaps immediately without re-rendering', async () => {
    const cache = new BitmapLruCache();
    const mockBitmap = createMockBitmap();
    cache.put('page-1', mockBitmap);

    const scheduler = new RenderScheduler({ cache });
    const renderSpy = vi.fn().mockResolvedValue(createMockBitmap());

    const result = await scheduler.schedule({
      id: 'page-1',
      pageIndex: 1,
      priority: RenderPriority.VISIBLE,
      render: renderSpy
    });

    expect(result).toBe(mockBitmap);
    expect(renderSpy).not.toHaveBeenCalled();
  });
});
