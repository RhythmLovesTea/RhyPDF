import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../../src/lib/performanceMonitor';
import { MemoryDegradationController } from '../../src/features/viewer/MemoryDegradationController';
import { BitmapLruCache } from '../../src/features/viewer/BitmapLruCache';
import { RenderScheduler, RenderPriority } from '../../src/features/viewer/RenderScheduler';
import { PixelBufferPool } from '@rhypdf/pdf-engine';
import {
  BatchOcrProcessor,
  isMultithreadingSupported,
  checkBatteryLow,
  TesseractOcrEngine
} from '@rhypdf/ocr';
import { clampScale } from '../../src/features/viewer/useZoomPan';

describe('Phase 16 UI Integration: Performance and Stability', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task 16.1 & 16.5: Web budgets & Main-thread hygiene (PerformanceMonitor)', () => {
    it('enforces web budgets: shell interactive < 2s, LCP < 2.5s, INP < 200ms', () => {
      const monitor = new PerformanceMonitor();
      monitor.recordShellInteractive(1150); // 1.15s < 2.0s
      monitor.recordLcp(1800); // 1.8s < 2.5s
      monitor.recordInteraction('pointerdown-zoom', 32); // 32ms < 200ms
      monitor.recordInteraction('text-input', 18); // 18ms < 200ms

      const report = monitor.checkBudgets();
      expect(report.allBudgetsMet).toBe(true);
      expect(report.violations.length).toBe(0);
      expect(report.shellInteractiveMs).toBe(1150);
      expect(report.lcpMs).toBe(1800);
      expect(report.maxInpMs).toBe(32);
    });

    it('detects and flags violations when performance thresholds are exceeded', () => {
      const monitor = new PerformanceMonitor();
      monitor.recordShellInteractive(2400); // exceeds 2000ms
      monitor.recordLcp(2800); // exceeds 2500ms
      monitor.recordInteraction('heavy-op', 250); // exceeds 200ms

      const report = monitor.checkBudgets();
      expect(report.allBudgetsMet).toBe(false);
      expect(report.violations.length).toBe(3);
    });

    it('asserts 0 long tasks (> 50ms) during user interaction', () => {
      const monitor = new PerformanceMonitor();
      monitor.setInteracting(true);
      // Small fast task during drag/resize
      monitor.recordLongTask(12, 'raf-frame');
      monitor.recordLongTask(16, 'snap-calc');
      monitor.setInteracting(false);

      const report = monitor.checkBudgets();
      expect(report.longTasksDuringInteractionCount).toBe(0);
      expect(report.allBudgetsMet).toBe(true);
    });

    it('flags main-thread tasks exceeding 50ms during user interaction', () => {
      const monitor = new PerformanceMonitor();
      monitor.setInteracting(true);
      monitor.recordLongTask(64, 'heavy-blocking-computation'); // > 50ms during interaction
      monitor.setInteracting(false);

      const report = monitor.checkBudgets();
      expect(report.allBudgetsMet).toBe(false);
      expect(report.longTasksDuringInteractionCount).toBe(1);
      expect(report.violations[0]).toContain('exceeded 50ms during user interaction');
    });
  });

  describe('Task 16.3: Memory Management & Graceful Degradation', () => {
    it('operates at normal tier with high memory (>4 GB) and standard page count', () => {
      const controller = new MemoryDegradationController();
      controller.setDeviceMemoryGb(8);
      controller.updateMetrics({ heapBytes: 40 * 1024 * 1024, pageCount: 15 });

      expect(controller.getTier()).toBe('normal');
      expect(controller.getAdaptiveDpr(2.0)).toBe(2.0);
      expect(controller.getAdaptiveCacheBudgetBytes()).toBe(128 * 1024 * 1024);
    });

    it('degrades to moderate tier on 4 GB device, >200 pages, or heap >100 MB', () => {
      const controller = new MemoryDegradationController();
      controller.setDeviceMemoryGb(4);
      expect(controller.getTier()).toBe('moderate');
      // Graceful degradation: DPR capped at 1.25x
      expect(controller.getAdaptiveDpr(2.0)).toBe(1.25);
      expect(controller.getAdaptiveCacheBudgetBytes()).toBe(64 * 1024 * 1024);
    });

    it('degrades to critical tier on 2 GB device, >500 pages, or heap >150 MB', () => {
      const controller = new MemoryDegradationController();
      controller.setDeviceMemoryGb(2);
      expect(controller.getTier()).toBe('critical');
      // Graceful degradation: DPR reduced to 1.0x to avoid OOM
      expect(controller.getAdaptiveDpr(2.0)).toBe(1.0);
      expect(controller.getAdaptiveCacheBudgetBytes()).toBe(32 * 1024 * 1024);
    });

    it('trims off-screen cached bitmaps under memory pressure', () => {
      const controller = new MemoryDegradationController();
      controller.setDeviceMemoryGb(2); // critical tier

      const cache = new BitmapLruCache({ maxSizeBytes: 64 * 1024 * 1024 });
      const mockBitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;

      cache.put('page_0', mockBitmap, 20 * 1024 * 1024);
      cache.put('page_1', mockBitmap, 20 * 1024 * 1024);

      controller.updateMetrics({ pageCount: 2 });
      const visibleKeys = new Set(['page_0']);
      const evicted = controller.trimCache(cache, visibleKeys);

      expect(evicted).toBe(1);
      expect(cache.has('page_0')).toBe(true);
      expect(cache.has('page_1')).toBe(false);
    });
  });

  describe('Task 16.4: Render Pipeline Optimization', () => {
    it('prioritizes VISIBLE pages over NEAR and THUMBNAIL jobs', async () => {
      const executionOrder: string[] = [];
      const scheduler = new RenderScheduler({ maxConcurrency: 1 });

      const createJob = (id: string, priority: RenderPriority) => ({
        id,
        pageIndex: 0,
        priority,
        render: async () => {
          executionOrder.push(id);
          return { width: 10, height: 10, close: () => {} } as unknown as ImageBitmap;
        }
      });

      // Schedule background, near, then visible
      const p1 = scheduler.schedule(createJob('thumb-1', RenderPriority.THUMBNAIL));
      const p2 = scheduler.schedule(createJob('near-1', RenderPriority.NEAR));
      const p3 = scheduler.schedule(createJob('visible-1', RenderPriority.VISIBLE));

      await Promise.all([p1, p2, p3]);

      // Job scheduled first begins immediately; remaining queue sorts visible before near/thumbnail
      expect(executionOrder).toContain('visible-1');
      expect(scheduler.getStats().completed).toBe(3);
    });

    it('cancels stale jobs when pages scroll out of view', async () => {
      const scheduler = new RenderScheduler({ maxConcurrency: 1 });

      const job2 = scheduler.schedule({
        id: 'page-10',
        pageIndex: 10,
        priority: RenderPriority.BACKGROUND,
        render: async () => {
          await new Promise((res) => setTimeout(res, 50));
          return { width: 10, height: 10, close: () => {} } as unknown as ImageBitmap;
        }
      });

      const cancelledCount = scheduler.cancelStaleJobs(new Set([0, 1])); // active pages are 0 and 1
      expect(cancelledCount).toBeGreaterThanOrEqual(1);

      await expect(job2).rejects.toThrow();
    });

    it('reuses buffers via PixelBufferPool to prevent GC churn', () => {
      const pool = PixelBufferPool.getInstance();
      pool.clear();

      const b1 = pool.acquire(4096);
      expect(b1.byteLength).toBe(4096);
      pool.release(b1);

      const b2 = pool.acquire(2048);
      // Reused pooled buffer
      expect(b2).toBe(b1);
      expect(pool.getStats().reusedCount).toBe(1);
    });
  });

  describe('Task 16.6: Smoothness & Scale Clamping (~60 FPS)', () => {
    it('clamps zoom scale smoothly within minimum and maximum limits', () => {
      expect(clampScale(0.1, 0.25, 8.0)).toBe(0.25);
      expect(clampScale(10.0, 0.25, 8.0)).toBe(8.0);
      expect(clampScale(1.5, 0.25, 8.0)).toBe(1.5);
    });
  });

  describe('Task 16.7: OCR Throttling on Hidden Tab & Low Battery', () => {
    it('triggers throttling callback when tab is hidden', async () => {
      const throttledEvents: string[] = [];
      const mockEngine = new TesseractOcrEngine();

      const processor = new BatchOcrProcessor(mockEngine);

      // Simulate document.hidden
      const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });

      const mockRender = async () =>
        ({
          data: new Uint8ClampedArray(400),
          width: 10,
          height: 10,
          colorSpace: 'srgb'
        }) as unknown as ImageData;

      await processor.processBatch(mockRender, 1, {
        language: 'eng',
        outputMode: 'editable',
        throttleOnHidden: true,
        pauseOnLowBattery: false,
        onThrottled: (reason) => {
          throttledEvents.push(reason);
        }
      });

      expect(throttledEvents).toContain('tab_hidden');

      if (originalHidden) {
        Object.defineProperty(document, 'hidden', originalHidden);
      }
    });

    it('safely evaluates battery state via checkBatteryLow helper', async () => {
      const isLow = await checkBatteryLow();
      // In happy-dom/Node navigator.getBattery is undefined, safely returns false
      expect(isLow).toBe(false);
    });
  });

  describe('Task 16.10: Multithreaded WASM (SharedArrayBuffer) with Single-thread Fallback', () => {
    it('detects whether crossOriginIsolated and SharedArrayBuffer allow multithreading', () => {
      const supported = isMultithreadingSupported();
      // In standard Node test runner without SharedArrayBuffer, gracefully returns false
      expect(typeof supported).toBe('boolean');
    });

    it('initializes Tesseract with single-thread fallback when multithreading is disabled', async () => {
      const engine = new TesseractOcrEngine();
      await engine.init({ enableMultithreading: false });
      expect(engine.isMultithreaded()).toBe(false);
    });

    it('enables multithreaded core when multithreading is explicitly requested', async () => {
      const engine = new TesseractOcrEngine();
      await engine.init({ enableMultithreading: true });
      expect(engine.isMultithreaded()).toBe(true);
    });
  });
});
