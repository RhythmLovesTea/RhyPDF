import { PDFDocument, PDFName, PDFArray } from 'pdf-lib';
import type { ExportOptions } from './types';

/**
 * Exports a PDF document with custom export options (Task 14.3).
 * Supports form flattening, annotation flattening, object stream optimization, and PDF version targeting.
 */
export async function exportPdfDocument(
  pdfBytes: Uint8Array,
  options: ExportOptions = {}
): Promise<Uint8Array> {
  const {
    flattenForms = false,
    flattenAnnotations = false,
    optimizeSize = true,
    pdfVersion = '1.7'
  } = options;

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  // 1. Flatten interactive forms if requested
  if (flattenForms) {
    try {
      const form = pdfDoc.getForm();
      form.flatten();
    } catch {
      // Document might not have an AcroForm, ignore
    }
  }

  // 2. Flatten annotations if requested
  if (flattenAnnotations) {
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const node = page.node;
      const annots = node.Annots();
      if (annots instanceof PDFArray) {
        // Remove interactive annotations from page catalog
        node.delete(PDFName.of('Annots'));
      }
    }
  }

  // 3. Serialize document with object stream compression
  const useObjectStreams = optimizeSize !== false;
  let savedBytes = await pdfDoc.save({ useObjectStreams });

  // 4. If target version differs, patch the header (%PDF-1.x)
  if (pdfVersion && savedBytes.length >= 8) {
    const headerStr = `%PDF-${pdfVersion}`;
    const headerBytes = new TextEncoder().encode(headerStr);
    // Replace the first 8 bytes if matching %PDF-
    if (
      savedBytes[0] === 0x25 && // %
      savedBytes[1] === 0x50 && // P
      savedBytes[2] === 0x44 && // D
      savedBytes[3] === 0x46 && // F
      savedBytes[4] === 0x2d // -
    ) {
      const copy = new Uint8Array(savedBytes);
      for (let i = 0; i < Math.min(headerBytes.length, 8); i++) {
        const b = headerBytes[i];
        if (b !== undefined) {
          copy[i] = b;
        }
      }
      savedBytes = copy;
    }
  }

  return savedBytes;
}
