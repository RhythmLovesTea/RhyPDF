/**
 * apps/editor/src/worker.ts
 * Dedicated Web Worker for PDF engine operations.
 */

import { init, WrappedPdfiumModule } from '@embedpdf/pdfium';

let pdfiumModule: WrappedPdfiumModule | null = null;

self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = event.data;

  if (type === 'PING') {
    self.postMessage({ id, type: 'PONG', payload: 'pong' });
    return;
  }

  if (type === 'INIT_PDFIUM') {
    try {
      const wasmUrl = payload?.wasmUrl || '/pdfium.wasm';
      const response = await fetch(wasmUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM binary from ${wasmUrl}: status ${response.status}`);
      }
      const wasmBinary = await response.arrayBuffer();
      pdfiumModule = await init({ wasmBinary });
      if (pdfiumModule.PDFiumExt_Init) {
        pdfiumModule.PDFiumExt_Init();
      }
      self.postMessage({
        id,
        type: 'INIT_PDFIUM_SUCCESS',
        payload: {
          status: 'pdfium_initialized',
          hasExtInit: typeof pdfiumModule.PDFiumExt_Init === 'function'
        }
      });
    } catch (err: unknown) {
      self.postMessage({
        id,
        type: 'INIT_PDFIUM_ERROR',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
};
