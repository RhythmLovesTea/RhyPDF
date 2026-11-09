import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPdfiumWasm, resetWasmCache, WasmLoadProgress } from '../src/index';

describe('WasmLoader (Task 2.3)', () => {
  beforeEach(() => {
    resetWasmCache();
    vi.restoreAllMocks();
  });

  it('lazy loads WASM with progress callback phases', async () => {
    const dummyWasmBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]); // Valid minimal WASM header

    // Mock fetch to simulate streaming chunks
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(dummyWasmBytes.slice(0, 4));
          controller.enqueue(dummyWasmBytes.slice(4));
          controller.close();
        }
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'application/wasm',
          'Content-Length': '8',
          'x-from-cache': 'true'
        }
      });
    });

    const progressReports: WasmLoadProgress[] = [];

    // Note: PDFium init will fail on synthetic 8-byte WASM, but the fetch and progress pipeline runs!
    try {
      await loadPdfiumWasm({
        wasmUrl: '/test-pdfium.wasm',
        onProgress: (p) => progressReports.push({ ...p })
      });
    } catch {
      // Expected to fail at WASM initialization since dummy bytes lack PDFium exports
    }

    expect(progressReports.length).toBeGreaterThanOrEqual(2);
    expect(progressReports[0].phase).toBe('fetching');
    expect(progressReports.some((p) => p.phase === 'fetching' && p.percent > 0)).toBe(true);
    expect(progressReports.some((p) => p.phase === 'compiling')).toBe(true);
  });

  it('reuses in-memory promise on subsequent calls (caching strategy)', async () => {
    let fetchCount = 0;
    const dummyWasmBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      fetchCount++;
      return new Response(dummyWasmBytes.buffer, {
        status: 200,
        headers: { 'Content-Length': '8' }
      });
    });

    const p1 = loadPdfiumWasm({ wasmUrl: '/cached.wasm' }).catch(() => 'err');
    const p2 = loadPdfiumWasm({ wasmUrl: '/cached.wasm' }).catch(() => 'err');

    await Promise.all([p1, p2]);
    expect(fetchCount).toBe(1); // Second call reused cached promise!
  });
});
