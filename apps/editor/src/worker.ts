/**
 * apps/editor/src/worker.ts
 * Dedicated Web Worker for PDF engine operations.
 * Implements lazy loading, chunked progress streaming, and offline WASM caching.
 */

import { loadPdfiumWasm, type WasmLoadProgress } from '@rhypdf/pdf-engine';
import type { WrappedPdfiumModule } from '@embedpdf/pdfium';

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

      pdfiumModule = await loadPdfiumWasm({
        wasmUrl,
        onProgress: (progress: WasmLoadProgress) => {
          self.postMessage({
            id,
            type: 'INIT_PDFIUM_PROGRESS',
            payload: progress
          });
        }
      });

      self.postMessage({
        id,
        type: 'INIT_PDFIUM_SUCCESS',
        payload: {
          status: 'pdfium_initialized',
          hasExtInit: typeof pdfiumModule?.PDFiumExt_Init === 'function'
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
