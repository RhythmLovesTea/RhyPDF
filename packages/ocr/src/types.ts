/**
 * @rhypdf/ocr
 * Comprehensive OCR domain models, options, and engine interfaces.
 */

import type { Rect } from '@rhypdf/pdf-model';

export type OcrOutputMode = 'searchable' | 'editable';

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: Rect;
  baseline?: { x0: number; y0: number; x1: number; y1: number };
  isBold?: boolean;
  isItalic?: boolean;
  fontSizePt?: number;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: Rect;
  words: OcrWord[];
  baselineY?: number;
  fontSizePt?: number;
}

export interface OcrBlock {
  id: string;
  text: string;
  confidence: number;
  bbox: Rect;
  lines: OcrLine[];
  blockType?: 'text' | 'table' | 'heading' | 'caption';
  estimatedFontSize?: number;
  estimatedFontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  textColorHex?: string;
}

export interface OcrPageResult {
  pageIndex: number;
  fullText: string;
  meanConfidence: number;
  blocks: OcrBlock[];
  durationMs: number;
  language: string;
  isHandwritingSuspected?: boolean;
  imageWidth: number;
  imageHeight: number;
  pageWidthPt?: number;
  pageHeightPt?: number;
}

export interface OcrProgress {
  status: 'idle' | 'loading' | 'preprocessing' | 'recognizing' | 'done' | 'aborted' | 'error';
  progress: number; // 0.0 to 1.0
  message?: string;
  pageIndex?: number;
  totalPages?: number;
}

export interface OcrEngineOptions {
  language: string;
  timeoutMs?: number;
  whitelistChars?: string;
  psm?: number;
  workerPath?: string;
  corePath?: string;
  langPath?: string;
  enableMultithreading?: boolean;
  onProgress?: (progress: OcrProgress) => void;
  signal?: AbortSignal;
}

export interface OcrEngine {
  readonly id: string;
  readonly name: string;
  isReady(): boolean;
  init(options?: Partial<OcrEngineOptions>): Promise<void>;
  recognize(
    image: ImageData | ImageBitmap | HTMLCanvasElement,
    options?: Partial<OcrEngineOptions>
  ): Promise<OcrPageResult>;
  terminate(): Promise<void>;
}

export interface ScannedPageDetectionResult {
  isScanned: boolean;
  confidence: number; // 0.0 to 1.0
  imageAreaRatio: number; // total image area divided by page area
  textRunCount: number;
  totalTextChars: number;
  reason: string;
  primaryImageId?: string;
}

export interface PreprocessOptions {
  deskew?: boolean;
  denoise?: boolean;
  binarize?: boolean;
  contrastStretch?: boolean;
  targetDpi?: number; // default ~300 DPI
}

export interface PreprocessResult {
  processedData: ImageData;
  detectedSkewAngleDeg: number;
  originalWidth: number;
  originalHeight: number;
  scaleFactor: number;
}

export interface ErasurePatch {
  bbox: Rect;
  backgroundColor: string; // hex or rgb
  isTextured: boolean;
  patchDataUrl?: string;
}

export interface RegionOcrRequest {
  pageIndex: number;
  region: Rect; // in PDF points
  language?: string;
  outputMode?: OcrOutputMode;
}

export interface BatchOcrOptions {
  pageIndices?: number[];
  language: string;
  outputMode: OcrOutputMode;
  onProgress?: (progress: BatchOcrProgress) => void;
  signal?: AbortSignal;
  throttleOnHidden?: boolean;
  pauseOnLowBattery?: boolean;
  onThrottled?: (reason: 'tab_hidden' | 'low_battery') => void;
}

/**
 * Task 16.10: Helper to detect multithreaded WASM (SharedArrayBuffer) capability.
 * Returns true only when cross-origin isolated and SharedArrayBuffer is defined.
 */
export function isMultithreadingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.crossOriginIsolated === true &&
    typeof SharedArrayBuffer !== 'undefined'
  );
}

/**
 * Task 16.7: Helper to check if battery level is low (< 20%) and discharging.
 */
export async function checkBatteryLow(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const battery = await (navigator as any).getBattery();
      if (
        battery &&
        typeof battery.level === 'number' &&
        battery.charging === false &&
        battery.level <= 0.2
      ) {
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

export interface BatchOcrProgress {
  currentPage: number;
  totalPages: number;
  pagePercent: number; // 0..100
  overallPercent: number; // 0..100
  statusMessage: string;
}

export interface BatchOcrResult {
  totalPagesProcessed: number;
  results: Map<number, OcrPageResult>;
  durationMs: number;
  averageConfidence: number;
}

export interface AccuracyReport {
  groundTruthLength: number;
  ocrTextLength: number;
  characterErrors: number;
  wordErrors: number;
  characterErrorRate: number; // CER (0.0 to 1.0)
  wordErrorRate: number; // WER (0.0 to 1.0)
  accuracyPercent: number; // (1 - CER) * 100
}
