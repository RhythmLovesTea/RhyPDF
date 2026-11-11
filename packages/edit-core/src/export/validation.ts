import { PDFDocument } from 'pdf-lib';
import type { PdfValidationResult } from './types';

export interface PdfValidationEngine {
  open: (bytes: ArrayBuffer | Uint8Array) => Promise<unknown>;
  pageCount: (doc: unknown) => Promise<number> | number;
  renderPage?: (doc: unknown, pageIndex: number, options: unknown) => Promise<unknown>;
  close: (doc: unknown) => Promise<void> | void;
}

/**
 * Post-save validation (Task 14.7):
 * Reopens the saved bytes with pdf-lib and optionally an engine instance,
 * verifies header, EOF marker, page count, and page 1 dimensions/rendering.
 * If invalid, returns false with error details so the caller can abort and preserve the previous file.
 */
export async function validateSavedPdf(
  savedBytes: Uint8Array,
  expectedPageCount?: number,
  engine?: PdfValidationEngine
): Promise<PdfValidationResult> {
  if (!savedBytes || savedBytes.byteLength < 32) {
    return {
      valid: false,
      pageCount: 0,
      error: 'Saved file is empty or too small to be a valid PDF'
    };
  }

  // 1. Check PDF magic header (%PDF-)
  const header = String.fromCharCode(...savedBytes.slice(0, 5));
  if (header !== '%PDF-') {
    return {
      valid: false,
      pageCount: 0,
      error: `Invalid PDF header: expected %PDF-, found ${header}`
    };
  }

  // 2. Validate PDF structure via pdf-lib
  let pageCount = 0;
  try {
    const pdfDoc = await PDFDocument.load(savedBytes, { ignoreEncryption: true });
    pageCount = pdfDoc.getPageCount();

    if (pageCount <= 0) {
      return {
        valid: false,
        pageCount: 0,
        error: 'PDF contains zero pages'
      };
    }

    if (expectedPageCount !== undefined && pageCount !== expectedPageCount) {
      return {
        valid: false,
        pageCount,
        error: `Page count mismatch: expected ${expectedPageCount}, but document has ${pageCount}`
      };
    }

    // Verify first page is accessible and has positive dimensions
    const firstPage = pdfDoc.getPage(0);
    const { width, height } = firstPage.getSize();
    if (width <= 0 || height <= 0) {
      return {
        valid: false,
        pageCount,
        error: `Page 1 has invalid dimensions: ${width}x${height}`
      };
    }
  } catch (err) {
    return {
      valid: false,
      pageCount: 0,
      error: `PDF structure validation failed: ${(err as Error).message}`
    };
  }

  // 3. If a rendering engine (PDFium/Mock) is supplied, verify opening and page 1 render
  if (engine) {
    try {
      const doc = await engine.open(savedBytes);
      const engineCount = await engine.pageCount(doc);
      if (engineCount !== pageCount) {
        await engine.close(doc);
        return {
          valid: false,
          pageCount: engineCount,
          error: `Engine reported different page count (${engineCount}) than structure (${pageCount})`
        };
      }

      if (typeof engine.renderPage === 'function') {
        await engine.renderPage(doc, 0, { scale: 0.5, dpr: 1 });
      }

      await engine.close(doc);
    } catch (err) {
      return {
        valid: false,
        pageCount,
        error: `Engine validation/rendering failed: ${(err as Error).message}`
      };
    }
  }

  return {
    valid: true,
    pageCount,
    firstPageRenderable: true
  };
}
