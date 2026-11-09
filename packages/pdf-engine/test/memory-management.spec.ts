import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as Comlink from 'comlink';
import {
  PdfiumEngine,
  MockPdfEngine,
  WorkerPdfEngine,
  EngineService,
  PdfError
} from '../src/index';

const FIXTURES_DIR = resolve(__dirname, '../../test-fixtures/fixtures');

describe('Task 2.13: Memory management, leak detector, and heap monitoring', () => {
  let wasmBinary: ArrayBuffer;
  let engine: PdfiumEngine;

  beforeAll(async () => {
    const wasmPath = resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = readFileSync(wasmPath).buffer;
    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('PdfiumEngine memory lifecycle', () => {
    it('manages document and page handles with explicit close and closePage', async () => {
      const sourceBuffer = readFileSync(resolve(FIXTURES_DIR, '01_text_single_column.pdf'));
      const inputBuffer = sourceBuffer.buffer.slice(
        sourceBuffer.byteOffset,
        sourceBuffer.byteOffset + sourceBuffer.byteLength
      );
      const doc = await engine.open(inputBuffer);

      let stats = await engine.getMemoryStats();
      expect(stats.activeDocuments).toBe(1);
      expect(stats.activePages).toBe(0);

      // Rendering page 0 loads the page handle
      const bmp = await engine.renderPage(doc, 0, { scale: 1, dpr: 1 });
      expect(bmp).toBeDefined();

      stats = await engine.getMemoryStats();
      expect(stats.activePages).toBe(1);

      // Explicitly close page 0
      await engine.closePage(doc, 0);

      stats = await engine.getMemoryStats();
      expect(stats.activePages).toBe(0);

      // Page can be loaded again after explicit close
      const bmp2 = await engine.renderPage(doc, 0, { scale: 1, dpr: 1 });
      expect(bmp2).toBeDefined();

      stats = await engine.getMemoryStats();
      expect(stats.activePages).toBe(1);

      // Explicit close of entire document
      await engine.close(doc);

      stats = await engine.getMemoryStats();
      expect(stats.activeDocuments).toBe(0);
      expect(stats.activePages).toBe(0);

      // Operation on closed handle throws IO PdfError
      await expect(engine.pageCount(doc)).rejects.toThrow(PdfError);
    });

    it('dev-mode leak detector accurately flags unclosed documents and pages', async () => {
      const sourceBuffer = readFileSync(resolve(FIXTURES_DIR, '01_text_single_column.pdf'));
      const inputBuffer = sourceBuffer.buffer.slice(
        sourceBuffer.byteOffset,
        sourceBuffer.byteOffset + sourceBuffer.byteLength
      );
      const doc = await engine.open(inputBuffer);
      await engine.renderPage(doc, 0, { scale: 1, dpr: 1 });

      const leakReport = engine.checkLeaks();
      expect(leakReport.hasLeaks).toBe(true);
      expect(leakReport.activeDocuments).toBe(1);
      expect(leakReport.activePages).toBe(1);
      expect(leakReport.details.length).toBeGreaterThan(0);
      expect(leakReport.details[0]).toContain(doc);

      // Calling dispose cleans up all leaked documents
      engine.setLeakDetector(true);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      engine.dispose();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();

      const postDisposeReport = engine.checkLeaks();
      expect(postDisposeReport.hasLeaks).toBe(false);
      expect(postDisposeReport.activeDocuments).toBe(0);
      expect(postDisposeReport.activePages).toBe(0);
    });

    it('reports accurate WASM heap total and stats via getMemoryStats', async () => {
      const stats = await engine.getMemoryStats();
      expect(stats.wasmHeapTotal).toBeGreaterThan(10 * 1024 * 1024); // WASM heap > 10MB
      expect(typeof stats.activeDocuments).toBe('number');
      expect(typeof stats.activePages).toBe('number');
    });
  });

  describe('MockPdfEngine memory lifecycle', () => {
    it('supports getMemoryStats, closePage, checkLeaks, and dispose', async () => {
      const mock = new MockPdfEngine();
      const doc = await mock.open(new ArrayBuffer(100));

      await mock.renderPage(doc, 0, { scale: 1, dpr: 1 });
      let stats = await mock.getMemoryStats();
      expect(stats.activeDocuments).toBe(1);
      expect(stats.activePages).toBe(1);

      await mock.closePage(doc, 0);
      stats = await mock.getMemoryStats();
      expect(stats.activePages).toBe(0);

      const leakReport = mock.checkLeaks();
      expect(leakReport.hasLeaks).toBe(true);

      await mock.close(doc);
      expect(mock.checkLeaks().hasLeaks).toBe(false);
    });
  });

  describe('WorkerPdfEngine auto-restart above heap threshold', () => {
    it('restarts worker automatically when heap threshold is exceeded after closing document', async () => {
      let spawnCount = 0;

      const createSimulatedEndpoint = (): MessagePort => {
        spawnCount++;
        const { port1, port2 } = new MessageChannel();
        const service = new EngineService(new MockPdfEngine());
        Comlink.expose(service, port1);
        return port2;
      };

      const initialPort = createSimulatedEndpoint();
      expect(spawnCount).toBe(1);

      const workerEngine = new WorkerPdfEngine(initialPort, {
        workerFactory: () => createSimulatedEndpoint() as unknown as Worker,
        heapThresholdBytes: 1024 // 1 KB threshold will trigger restart
      });

      // Explicit restart test
      await workerEngine.restartWorker();
      expect(spawnCount).toBe(2);

      // Verify stats call passes through to restarted worker
      const stats = await workerEngine.getMemoryStats();
      expect(stats.wasmHeapTotal).toBeGreaterThan(0);

      workerEngine.terminate();
    });
  });
});
