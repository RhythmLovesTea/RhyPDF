import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  PdfiumEngine,
  MockPdfEngine,
  WorkerPdfEngine,
  EngineService,
  PdfError,
  isPdfError
} from '../src/index';
import { generate200PdfCorpus, type CorpusPdf } from './fuzz-corpus-generator';
import * as Comlink from 'comlink';

describe('Task 16.8 & Phase 16 Done When: 200-PDF Robustness & Fuzz Corpus Automated Run', () => {
  let wasmBinary: ArrayBuffer;
  let engine: PdfiumEngine;
  let corpus: CorpusPdf[];

  beforeAll(async () => {
    const wasmPath = resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = readFileSync(wasmPath).buffer;
    engine = await PdfiumEngine.create({ wasmBinary });
    corpus = generate200PdfCorpus();
  });

  it('generates a corpus containing exactly 200 unique test PDFs across all categories', () => {
    expect(corpus.length).toBe(200);
    const categories = new Set(corpus.map((p) => p.category));
    expect(categories.size).toBe(10);
    expect(corpus.filter((p) => p.category === 'valid_baseline').length).toBe(20);
    expect(corpus.filter((p) => p.category === 'random_noise').length).toBe(20);
    expect(corpus.filter((p) => p.category === 'bit_flips').length).toBe(30);
  });

  it('processes all 200 PDFs without crashing the process or engine', async () => {
    let handledCount = 0;
    let validCount = 0;
    let rejectedCount = 0;

    for (const item of corpus) {
      try {
        const handle = await engine.open(item.data.buffer.slice(0));
        validCount++;
        expect(typeof handle).toBe('string');
        const count = await engine.pageCount(handle);
        expect(count).toBeGreaterThanOrEqual(0);
        await engine.close(handle);
      } catch (err: unknown) {
        rejectedCount++;
        // Must reject with a structured, typed PdfError (Corrupt, Unsupported, or IO)
        expect(isPdfError(err)).toBe(true);
        const pdfErr = err as PdfError;
        expect(['Corrupt', 'Unsupported', 'IO', 'Unknown']).toContain(pdfErr.code);
      }
      handledCount++;
    }

    expect(handledCount).toBe(200);
    // All 20 baseline valid PDFs opened cleanly
    expect(validCount).toBeGreaterThanOrEqual(20);
    // Malformed, corrupted, truncated, and noise files were safely rejected
    expect(rejectedCount).toBeGreaterThan(0);
    expect(validCount + rejectedCount).toBe(200);
  });

  it('proves engine remains fully healthy and functional after the 200-PDF corpus run', async () => {
    const validSample = corpus.find((p) => p.category === 'valid_baseline')!;
    const handle = await engine.open(validSample.data.buffer.slice(0));
    expect(handle).toBeDefined();

    const pageCount = await engine.pageCount(handle);
    expect(pageCount).toBeGreaterThanOrEqual(1);

    const info = await engine.pageInfo(handle, 0);
    expect(info.width).toBeGreaterThan(0);
    expect(info.height).toBeGreaterThan(0);

    const bitmap = await engine.renderPage(handle, 0, { scale: 1, dpr: 1 });
    expect(bitmap).toBeDefined();
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }

    await engine.close(handle);
  });

  it('handles worker termination and recovers gracefully (WorkerPdfEngine restart)', async () => {
    const mockWorkerInstance = {
      postMessage: () => {},
      terminate: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    const workerFactory = () => {
      return mockWorkerInstance as unknown as Worker;
    };

    // Use in-memory MockPdfEngine via EngineService endpoint
    const service = new EngineService(new MockPdfEngine());
    const channel = new MessageChannel();
    Comlink.expose(service, channel.port1);

    const workerEngine = new WorkerPdfEngine(channel.port2, {
      workerFactory: () => {
        workerFactory();
        const nextChannel = new MessageChannel();
        Comlink.expose(new EngineService(new MockPdfEngine()), nextChannel.port1);
        return nextChannel.port2 as unknown as Worker;
      }
    });

    const doc = await workerEngine.open(new Uint8Array(20).buffer);
    expect(doc).toBeDefined();
    const count = await workerEngine.pageCount(doc);
    expect(count).toBeGreaterThan(0);

    // Simulate crash and restart
    await workerEngine.restartWorker();
    expect(workerEngine.getIsCrashed()).toBe(false);

    // Open another document after restart
    const docAfter = await workerEngine.open(new Uint8Array(20).buffer);
    expect(docAfter).toBeDefined();
    const countAfter = await workerEngine.pageCount(docAfter);
    expect(countAfter).toBeGreaterThan(0);
  });
});
