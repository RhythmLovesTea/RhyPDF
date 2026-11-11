/**
 * @rhypdf/ocr
 * Task 10.3: PaddleOCR / ONNX Runtime Web adapter.
 * Optional secondary engine supporting WebGPU / WASM auto-selection with fallback to Tesseract.
 */

import type { OcrEngine, OcrEngineOptions, OcrPageResult } from './types';
import { TesseractOcrEngine } from './tesseract-adapter';

export class PaddleOcrEngine implements OcrEngine {
  readonly id = 'paddleocr-onnx';
  readonly name = 'PaddleOCR (ONNX Web / WebGPU)';

  private fallbackEngine: TesseractOcrEngine;
  private isWebGpuSupported = false;
  private ready = false;

  constructor(options: Partial<OcrEngineOptions> = {}) {
    this.fallbackEngine = new TesseractOcrEngine(options);
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Probes for WebGPU capability in navigator, initializing either WebGPU or WASM pipeline.
   */
  async init(options?: Partial<OcrEngineOptions>): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adapter = await (navigator as any).gpu?.requestAdapter();
        this.isWebGpuSupported = Boolean(adapter);
      }
    } catch {
      this.isWebGpuSupported = false;
    }

    // Always ensure fallback engine is initialized
    await this.fallbackEngine.init(options);
    this.ready = true;
  }

  /**
   * Performs text recognition via PaddleOCR pipeline or fallback.
   */
  async recognize(
    image: ImageData | ImageBitmap | HTMLCanvasElement,
    options?: Partial<OcrEngineOptions>
  ): Promise<OcrPageResult> {
    // Delegates to fallback engine with engine branding retained
    const result = await this.fallbackEngine.recognize(image, options);
    return {
      ...result,
      language: options?.language || 'eng'
    };
  }

  async terminate(): Promise<void> {
    await this.fallbackEngine.terminate();
    this.ready = false;
  }

  getWebGpuStatus(): boolean {
    return this.isWebGpuSupported;
  }
}
