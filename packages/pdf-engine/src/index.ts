/**
 * @rhypdf/pdf-engine
 * PdfEngine interface, mutation models, and engine contracts.
 * Strictly no PDFium types leak outside this package.
 */

import type { PageInfo, PageObject, TextRun, Matrix2D, Rect, ColorRGBA } from '@rhypdf/pdf-model';

export type DocumentHandle = string;

export interface RenderOptions {
  scale: number;
  dpr: number;
  clipRect?: Rect;
  rotationOverride?: 0 | 90 | 180 | 270;
  renderAnnotations?: boolean;
}

export type PageMutation =
  | {
      type: 'removeObject';
      objectId: string;
    }
  | {
      type: 'insertText';
      text: string;
      fontName: string;
      fontSize: number;
      fillColor: ColorRGBA;
      matrix: Matrix2D;
    }
  | {
      type: 'insertImage';
      imageData: Uint8Array;
      width: number;
      height: number;
      matrix: Matrix2D;
      format: 'rgba' | 'jpeg';
    }
  | {
      type: 'setMatrix';
      objectId: string;
      matrix: Matrix2D;
    }
  | {
      type: 'reorderObject';
      objectId: string;
      newZIndex: number;
    };

export interface MutationResult {
  success: boolean;
  affectedPage: number;
  remainingObjectsCount: number;
}

export interface SaveOptions {
  incremental?: boolean;
  stripSecurity?: boolean;
  password?: string;
}

export type PdfErrorCode =
  | 'Corrupt'
  | 'WrongPassword'
  | 'PasswordRequired'
  | 'Unsupported'
  | 'OutOfMemory'
  | 'IO'
  | 'Cancelled'
  | 'Unknown';

export class PdfError extends Error {
  constructor(
    public readonly code: PdfErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'PdfError';
  }
}

export interface PdfEngine {
  open(data: ArrayBuffer | Blob, opts?: { password?: string }): Promise<DocumentHandle>;
  close(doc: DocumentHandle): Promise<void>;
  pageCount(doc: DocumentHandle): Promise<number>;
  pageInfo(doc: DocumentHandle, page: number): Promise<PageInfo>;
  renderPage(
    doc: DocumentHandle,
    page: number,
    opts: RenderOptions,
    signal?: AbortSignal
  ): Promise<ImageBitmap>;
  getPageObjects(doc: DocumentHandle, page: number): Promise<PageObject[]>;
  extractText(doc: DocumentHandle, page: number): Promise<TextRun[]>;
  mutate(doc: DocumentHandle, page: number, ops: PageMutation[]): Promise<MutationResult>;
  save(doc: DocumentHandle, opts?: SaveOptions): Promise<Blob>;
}

export { MockPdfEngine } from './mock';
export { PdfiumEngine } from './pdfium-engine';
export { SerializedQueue } from './queue';
export { WorkerPdfEngine } from './host/WorkerPdfEngine';
export { EngineService } from './worker/engine-service';
export type { PdfEngineWorkerApi } from './protocol';
export { loadPdfiumWasm, resetWasmCache } from './wasm-loader';
export type { WasmLoadProgress, WasmProgressCallback, WasmLoaderOptions } from './wasm-loader';
