/**
 * WASM Loading Strategy:
 * - Lazy-loaded on demand
 * - Streaming compile & chunked progress reporting
 * - Cached by Service Worker (CacheStorage) for instant offline startup
 */

import { init, WrappedPdfiumModule } from '@embedpdf/pdfium';

export interface WasmLoadProgress {
  phase: 'idle' | 'fetching' | 'compiling' | 'ready' | 'error';
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  fromCache: boolean;
  error?: string;
}

export type WasmProgressCallback = (progress: WasmLoadProgress) => void;

export interface WasmLoaderOptions {
  wasmUrl?: string;
  onProgress?: WasmProgressCallback;
}

let cachedModulePromise: Promise<WrappedPdfiumModule> | null = null;

export async function loadPdfiumWasm(options?: WasmLoaderOptions): Promise<WrappedPdfiumModule> {
  if (cachedModulePromise) {
    return cachedModulePromise;
  }

  cachedModulePromise = (async () => {
    const wasmUrl = options?.wasmUrl || '/pdfium.wasm';
    const onProgress = options?.onProgress;

    onProgress?.({
      phase: 'fetching',
      loadedBytes: 0,
      totalBytes: 4646932,
      percent: 0,
      fromCache: false
    });

    const response = await fetch(wasmUrl);
    if (!response.ok) {
      const err = `Failed to fetch WASM binary from ${wasmUrl}: status ${response.status}`;
      onProgress?.({
        phase: 'error',
        loadedBytes: 0,
        totalBytes: 0,
        percent: 0,
        fromCache: false,
        error: err
      });
      throw new Error(err);
    }

    // Check if served from Service Worker or browser cache
    const fromCache =
      response.headers.get('x-from-cache') === 'true' || response.headers.get('age') !== null;

    const contentLength = Number(response.headers.get('Content-Length')) || 4646932;
    let wasmBinary: ArrayBuffer;

    if (response.body && typeof ReadableStream !== 'undefined') {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedBytes += value.length;
          const percent = Math.min(95, Math.round((loadedBytes / contentLength) * 95));
          onProgress?.({
            phase: 'fetching',
            loadedBytes,
            totalBytes: contentLength,
            percent,
            fromCache
          });
        }
      }

      // Combine chunks into single ArrayBuffer
      const combined = new Uint8Array(loadedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      wasmBinary = combined.buffer;
    } else {
      wasmBinary = await response.arrayBuffer();
    }

    onProgress?.({
      phase: 'compiling',
      loadedBytes: contentLength,
      totalBytes: contentLength,
      percent: 96,
      fromCache
    });

    // Initialize PDFium WebAssembly module
    const module = await init({ wasmBinary });
    if (module.PDFiumExt_Init) {
      module.PDFiumExt_Init();
    }

    onProgress?.({
      phase: 'ready',
      loadedBytes: contentLength,
      totalBytes: contentLength,
      percent: 100,
      fromCache
    });

    return module;
  })();

  return cachedModulePromise;
}

/**
 * Reset module cache (useful for testing or worker teardown)
 */
export function resetWasmCache(): void {
  cachedModulePromise = null;
}
