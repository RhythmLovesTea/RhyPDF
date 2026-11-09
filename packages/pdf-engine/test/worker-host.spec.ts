import { describe, it, expect, beforeEach } from 'vitest';
import * as Comlink from 'comlink';
import { SerializedQueue, EngineService, WorkerPdfEngine } from '../src/index';

describe('SerializedQueue', () => {
  let queue: SerializedQueue;

  beforeEach(() => {
    queue = new SerializedQueue();
  });

  it('executes tasks sequentially in strict FIFO order', async () => {
    const executionOrder: number[] = [];

    const task1 = queue.enqueue('t1', async () => {
      await new Promise((r) => setTimeout(r, 20));
      executionOrder.push(1);
      return 'res1';
    });

    const task2 = queue.enqueue('t2', async () => {
      await new Promise((r) => setTimeout(r, 5));
      executionOrder.push(2);
      return 'res2';
    });

    const task3 = queue.enqueue('t3', async () => {
      executionOrder.push(3);
      return 'res3';
    });

    const results = await Promise.all([task1, task2, task3]);
    expect(results).toEqual(['res1', 'res2', 'res3']);
    expect(executionOrder).toEqual([1, 2, 3]);
  });

  it('cancels pending queued task before execution', async () => {
    const slowTask = queue.enqueue('slow', async () => {
      await new Promise((r) => setTimeout(r, 50));
      return 'slow done';
    });

    const pendingTask = queue.enqueue('pending', async () => {
      return 'pending done';
    });

    // Cancel pending task while slowTask is executing
    const cancelled = queue.cancel('pending');
    expect(cancelled).toBe(true);

    await expect(pendingTask).rejects.toMatchObject({
      code: 'Cancelled'
    });

    const slowRes = await slowTask;
    expect(slowRes).toBe('slow done');
  });
});

describe('Worker Host + Comlink RPC (Task 2.2)', () => {
  function createTestPair(): { hostEngine: WorkerPdfEngine; cleanup: () => void } {
    const { port1, port2 } = new MessageChannel();
    const service = new EngineService();
    Comlink.expose(service, port1);

    const hostEngine = new WorkerPdfEngine(port2);

    return {
      hostEngine,
      cleanup: () => {
        port1.close();
        port2.close();
      }
    };
  }

  function getSampleData(): ArrayBuffer {
    return new TextEncoder().encode('%PDF-1.7\n%Test RPC\n%%EOF').buffer;
  }

  it('performs RPC calls across MessageChannel endpoints', async () => {
    const { hostEngine, cleanup } = createTestPair();

    const doc = await hostEngine.open(getSampleData());
    expect(typeof doc).toBe('string');

    const count = await hostEngine.pageCount(doc);
    expect(count).toBe(2);

    const info = await hostEngine.pageInfo(doc, 0);
    expect(info.pageIndex).toBe(0);
    expect(info.width).toBeCloseTo(595.28, 1);

    const objects = await hostEngine.getPageObjects(doc, 0);
    expect(objects.length).toBe(3);

    const textRuns = await hostEngine.extractText(doc, 0);
    expect(textRuns.length).toBe(2);

    const savedBlob = await hostEngine.save(doc);
    expect(savedBlob).toBeInstanceOf(Blob);
    expect(savedBlob.size).toBeGreaterThan(0);

    await hostEngine.close(doc);
    cleanup();
  });

  it('handles 100 concurrent calls from the UI correctly without corruption or dropping', async () => {
    const { hostEngine, cleanup } = createTestPair();
    const doc = await hostEngine.open(getSampleData());

    const CONCURRENT_COUNT = 100;
    const promises: Promise<unknown>[] = [];

    for (let i = 0; i < CONCURRENT_COUNT; i++) {
      const pageIndex = i % 2;
      if (i % 3 === 0) {
        promises.push(hostEngine.pageInfo(doc, pageIndex));
      } else if (i % 3 === 1) {
        promises.push(hostEngine.extractText(doc, pageIndex));
      } else {
        promises.push(hostEngine.getPageObjects(doc, pageIndex));
      }
    }

    expect(promises.length).toBe(CONCURRENT_COUNT);
    const results = await Promise.all(promises);

    expect(results.length).toBe(CONCURRENT_COUNT);
    results.forEach((res) => {
      expect(res).toBeDefined();
    });

    await hostEngine.close(doc);
    cleanup();
  });

  it('cancels in-flight / queued RPC calls via AbortSignal', async () => {
    const { hostEngine, cleanup } = createTestPair();
    const doc = await hostEngine.open(getSampleData());

    const controller = new AbortController();

    // Trigger abort almost immediately
    setTimeout(() => {
      controller.abort();
    }, 5);

    // Call renderPage with signal
    await expect(
      hostEngine.renderPage(doc, 0, { scale: 2.0, dpr: 2.0 }, controller.signal)
    ).rejects.toMatchObject({
      code: 'Cancelled'
    });

    // Verify subsequent calls continue to work smoothly after cancellation
    const pageCount = await hostEngine.pageCount(doc);
    expect(pageCount).toBe(2);

    await hostEngine.close(doc);
    cleanup();
  });
});
