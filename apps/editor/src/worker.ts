/**
 * apps/editor/src/worker.ts
 * Dedicated Web Worker for PDF engine operations.
 */

self.onmessage = async (event: MessageEvent) => {
  const { id, type } = event.data;

  if (type === 'PING') {
    self.postMessage({ id, type: 'PONG', payload: 'pong' });
    return;
  }

  if (type === 'INIT') {
    try {
      // Worker plumbing initialized successfully
      self.postMessage({
        id,
        type: 'INIT_SUCCESS',
        payload: {
          status: 'ready',
          timestamp: Date.now()
        }
      });
    } catch (err: unknown) {
      self.postMessage({
        id,
        type: 'INIT_ERROR',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
};
