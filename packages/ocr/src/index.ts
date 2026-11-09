/**
 * @rhypdf/ocr
 * OcrEngine interfaces and result data structures.
 */

import type { Rect } from '@rhypdf/pdf-model';

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: Rect;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: Rect;
  words: OcrWord[];
}

export interface OcrBlock {
  text: string;
  confidence: number;
  bbox: Rect;
  lines: OcrLine[];
}

export interface OcrPageResult {
  fullText: string;
  meanConfidence: number;
  blocks: OcrBlock[];
  durationMs: number;
}

export interface OcrEngineOptions {
  language: string;
  timeoutMs?: number;
  whitelistChars?: string;
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
