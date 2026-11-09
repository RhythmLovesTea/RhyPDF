/**
 * Serialized FIFO Request Queue
 * PDFium WebAssembly is single-threaded and not thread-safe.
 * All operations must be serialized sequentially.
 */

import { PdfError } from './index';

interface QueuedItem<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  abortController?: AbortController;
  cancelled: boolean;
}

export class SerializedQueue {
  private queue: QueuedItem<unknown>[] = [];
  private isProcessing = false;
  private currentItem: QueuedItem<unknown> | null = null;

  /**
   * Enqueue an asynchronous operation to be executed in sequence.
   */
  enqueue<T>(id: string, execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const item: QueuedItem<T> = {
        id,
        execute,
        resolve: resolve as (val: unknown) => void,
        reject,
        abortController: new AbortController(),
        cancelled: false
      };

      this.queue.push(item as QueuedItem<unknown>);
      this.processNext();
    });
  }

  /**
   * Cancel an enqueued or currently executing task by id.
   */
  cancel(id: string): boolean {
    // 1. Check if the task is currently active
    if (this.currentItem && this.currentItem.id === id) {
      this.currentItem.cancelled = true;
      this.currentItem.abortController?.abort();
      this.currentItem.reject(
        new PdfError('Cancelled', `Task ${id} was cancelled during execution`)
      );
      return true;
    }

    // 2. Check if the task is waiting in the queue
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      const [item] = this.queue.splice(index, 1);
      if (item) {
        item.cancelled = true;
        item.reject(new PdfError('Cancelled', `Task ${id} was cancelled before execution`));
        return true;
      }
    }

    return false;
  }

  /**
   * Current number of waiting tasks plus currently executing task.
   */
  get length(): number {
    return this.queue.length + (this.currentItem ? 1 : 0);
  }

  /**
   * Clear all pending tasks in the queue, rejecting them with Cancelled.
   */
  clear(): void {
    if (this.currentItem) {
      this.currentItem.abortController?.abort();
      this.currentItem = null;
    }
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      item?.reject(new PdfError('Cancelled', 'Queue was cleared'));
    }
    this.isProcessing = false;
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift()!;
    this.currentItem = item;

    if (item.cancelled) {
      this.currentItem = null;
      this.isProcessing = false;
      this.processNext();
      return;
    }

    try {
      const result = await item.execute();
      if (!item.cancelled) {
        item.resolve(result);
      }
    } catch (err) {
      if (!item.cancelled) {
        item.reject(err);
      }
    } finally {
      this.currentItem = null;
      this.isProcessing = false;
      this.processNext();
    }
  }
}
