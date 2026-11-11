/**
 * @rhypdf/ocr
 * Task 10.12: Batch OCR Processor.
 * Coordinates multi-page OCR across documents with caching, resumability, and progress callbacks.
 */

import type { OcrEngine, BatchOcrOptions, BatchOcrResult, OcrPageResult } from './types';
import { checkBatteryLow } from './types';
import { OcrCache } from './ocr-cache';

export class BatchOcrProcessor {
  constructor(
    private readonly engine: OcrEngine,
    private readonly cache: OcrCache = OcrCache.getInstance()
  ) {}

  /**
   * Processes a sequence of document pages in batch.
   *
   * @param renderPage Callback that renders a specific page to ImageData
   * @param totalPages Total pages in document
   * @param options Batch options (page range, language, outputMode, progress, signal)
   */
  async processBatch(
    renderPage: (pageIndex: number) => Promise<ImageData>,
    totalPages: number,
    options: BatchOcrOptions
  ): Promise<BatchOcrResult> {
    const startTime = performance.now();
    const targetPages =
      options.pageIndices && options.pageIndices.length > 0
        ? options.pageIndices.filter((p) => p >= 0 && p < totalPages)
        : Array.from({ length: totalPages }, (_, i) => i);

    const results = new Map<number, OcrPageResult>();
    let totalConfidence = 0;

    for (let i = 0; i < targetPages.length; i++) {
      if (options.signal?.aborted) {
        break;
      }

      // Task 16.7: Throttle when tab is hidden or battery is low
      if (
        options.throttleOnHidden !== false &&
        typeof document !== 'undefined' &&
        document.hidden
      ) {
        options.onThrottled?.('tab_hidden');
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (options.pauseOnLowBattery !== false) {
        const isLow = await checkBatteryLow();
        if (isLow) {
          options.onThrottled?.('low_battery');
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      if (options.signal?.aborted) {
        break;
      }

      const pageIndex = targetPages[i]!;
      const cacheKey = this.cache.generateKey(
        `page_${pageIndex}`,
        options.language,
        options.outputMode
      );

      if (options.onProgress) {
        options.onProgress({
          currentPage: pageIndex + 1,
          totalPages: targetPages.length,
          pagePercent: 10,
          overallPercent: Math.round((i / targetPages.length) * 100),
          statusMessage: `Processing page ${pageIndex + 1} of ${targetPages.length}...`
        });
      }

      let pageResult = await this.cache.get(cacheKey);

      if (!pageResult) {
        const pageImage = await renderPage(pageIndex);

        if (options.onProgress) {
          options.onProgress({
            currentPage: pageIndex + 1,
            totalPages: targetPages.length,
            pagePercent: 50,
            overallPercent: Math.round(((i + 0.5) / targetPages.length) * 100),
            statusMessage: `Running OCR on page ${pageIndex + 1}...`
          });
        }

        pageResult = await this.engine.recognize(pageImage, {
          language: options.language,
          signal: options.signal
        });

        await this.cache.set(cacheKey, pageResult);
      }

      results.set(pageIndex, pageResult);
      totalConfidence += pageResult.meanConfidence;

      if (options.onProgress) {
        options.onProgress({
          currentPage: pageIndex + 1,
          totalPages: targetPages.length,
          pagePercent: 100,
          overallPercent: Math.round(((i + 1) / targetPages.length) * 100),
          statusMessage: `Page ${pageIndex + 1} complete.`
        });
      }
    }

    const durationMs = performance.now() - startTime;
    const averageConfidence = results.size > 0 ? totalConfidence / results.size : 0;

    return {
      totalPagesProcessed: results.size,
      results,
      durationMs,
      averageConfidence
    };
  }
}
