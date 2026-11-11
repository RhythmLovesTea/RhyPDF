/**
 * @rhypdf/pdf-engine
 * PdfEngine interface, mutation models, and engine contracts.
 * Strictly no PDFium types leak outside this package.
 */

import type {
  PageInfo,
  PageObject,
  TextRun,
  Matrix2D,
  Rect,
  ColorRGBA,
  TextRenderMode,
  PathSegment
} from '@rhypdf/pdf-model';

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
      type: 'insertText' | 'insertTextObject';
      text: string;
      fontName?: string;
      fontSize: number;
      fillColor?: ColorRGBA;
      strokeColor?: ColorRGBA;
      matrix: Matrix2D;
      renderMode?: TextRenderMode;
    }
  | {
      type: 'insertImage' | 'insertImageObject';
      imageData: Uint8Array;
      width: number;
      height: number;
      matrix: Matrix2D;
      format?: 'rgba' | 'jpeg';
    }
  | {
      type: 'insertPathObject';
      segments: PathSegment[];
      lineWidth?: number;
      strokeColor?: ColorRGBA;
      fillColor?: ColorRGBA;
      fillMode?: 'none' | 'alternate' | 'winding';
      stroke?: boolean;
      fill?: boolean;
      matrix?: Matrix2D;
    }
  | {
      type: 'setMatrix';
      objectId: string;
      matrix: Matrix2D;
    }
  | {
      type: 'setColor';
      objectId: string;
      strokeColor?: ColorRGBA;
      fillColor?: ColorRGBA;
    }
  | {
      type: 'reorderObject';
      objectId: string;
      newZIndex: number;
    }
  | {
      type: 'setTextRenderMode';
      objectId: string;
      renderMode: TextRenderMode;
    };

export interface MutationResult {
  success: boolean;
  affectedPage: number;
  remainingObjectsCount: number;
}

export interface SaveOptions {
  incremental?: boolean;
  version?: number;
  stripSecurity?: boolean;
  password?: string;
  ownerPassword?: string;
  permissions?: number;
  destination?: WritableStream<Uint8Array>;
}

export interface MemoryStats {
  wasmHeapTotal: number;
  activeDocuments: number;
  activePages: number;
}

export interface LeakReport {
  hasLeaks: boolean;
  activeDocuments: number;
  activePages: number;
  details: string[];
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
    message: string,
    cause?: unknown
  ) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'PdfError';
    Object.setPrototypeOf(this, PdfError.prototype);
  }
}

export function isPdfError(err: unknown, code?: PdfErrorCode): err is PdfError {
  if (!(err instanceof Error)) return false;
  const isErr =
    err instanceof PdfError || err.name === 'PdfError' || err.name.startsWith('PdfError:');
  if (!isErr) return false;
  const pdfErr = err as PdfError;
  const actualCode =
    pdfErr.code ??
    (err.name.startsWith('PdfError:') ? (err.name.slice(9) as PdfErrorCode) : undefined);
  return code === undefined || actualCode === code;
}

export function mapPdfiumErrorCode(
  errorCode: number,
  passwordProvided = false,
  customMsg?: string
): PdfError {
  switch (errorCode) {
    case 4: // FPDF_ERR_PASSWORD
      return passwordProvided
        ? new PdfError('WrongPassword', customMsg ?? 'Incorrect password for protected PDF')
        : new PdfError(
            'PasswordRequired',
            customMsg ?? 'Password is required to open this protected PDF'
          );
    case 3: // FPDF_ERR_FORMAT
      return new PdfError('Corrupt', customMsg ?? 'Document format is invalid or corrupt');
    case 2: // FPDF_ERR_FILE
      return new PdfError('IO', customMsg ?? 'Unable to read PDF document data');
    case 5: // FPDF_ERR_SECURITY
      return new PdfError('Unsupported', customMsg ?? 'Unsupported encryption or security handler');
    case 6: // FPDF_ERR_PAGE
      return new PdfError('Unsupported', customMsg ?? 'Page not found or invalid page structure');
    default:
      return new PdfError(
        'Unknown',
        customMsg ?? `PDF operation failed with engine error code: ${errorCode}`
      );
  }
}

export function mapToPdfError(err: unknown, defaultCode: PdfErrorCode = 'Unknown'): PdfError {
  if (err instanceof PdfError) {
    return err;
  }
  if (
    err &&
    typeof err === 'object' &&
    'name' in err &&
    typeof (err as { name: unknown }).name === 'string'
  ) {
    const raw = err as { name: string; code?: PdfErrorCode; message?: string; cause?: unknown };
    let extractedCode = raw.code;
    if (!extractedCode && raw.name.startsWith('PdfError:')) {
      extractedCode = raw.name.slice(9) as PdfErrorCode;
    }
    if (raw.name === 'PdfError' || raw.name.startsWith('PdfError:')) {
      return new PdfError(
        extractedCode ?? defaultCode,
        raw.message ?? 'Unknown PDF error',
        raw.cause
      );
    }
  }
  if (err instanceof Error) {
    const msg = err.message || '';
    if (msg.includes('aborted') || msg.includes('cancelled') || err.name === 'AbortError') {
      return new PdfError('Cancelled', msg, err);
    }
    if (msg.includes('Out of Memory') || msg.includes('OOM') || msg.includes('allocation failed')) {
      return new PdfError('OutOfMemory', msg, err);
    }
    return new PdfError(defaultCode, msg, err);
  }
  return new PdfError(defaultCode, String(err));
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
  closePage?(doc: DocumentHandle, page: number): Promise<void>;
  getMemoryStats?(): Promise<MemoryStats>;
  checkLeaks?(): LeakReport;
}

export { MockPdfEngine } from './mock';
export { PdfiumEngine } from './pdfium-engine';
export { SerializedQueue } from './queue';
export { WorkerPdfEngine } from './host/WorkerPdfEngine';
export { EngineService } from './worker/engine-service';
export type { PdfEngineWorkerApi } from './protocol';
export { loadPdfiumWasm, resetWasmCache } from './wasm-loader';
export type { WasmLoadProgress, WasmProgressCallback, WasmLoaderOptions } from './wasm-loader';
export { PixelBufferPool } from './buffer-pool';
export type { BufferPoolOptions } from './buffer-pool';
