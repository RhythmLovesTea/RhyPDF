import { PDFDocument } from 'pdf-lib';
import type { PrintOptions } from './types';
import { parsePageRange } from '../pages/operations';

/**
 * Prepares PDF bytes for printing based on chosen page ranges and copy count (Task 14.5).
 */
export async function preparePrintPdf(
  pdfBytes: Uint8Array,
  options: PrintOptions = {}
): Promise<Uint8Array> {
  const { pageRange = 'all', copies = 1 } = options;

  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    return pdfBytes;
  }

  // 1. Resolve which page indices to include
  let targetIndices: number[];
  if (!pageRange || pageRange.trim().toLowerCase() === 'all') {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i);
  } else {
    targetIndices = parsePageRange(pageRange, totalPages);
    if (targetIndices.length === 0) {
      targetIndices = Array.from({ length: totalPages }, (_, i) => i);
    }
  }

  // If no range filter and only 1 copy, return original bytes unchanged
  if (targetIndices.length === totalPages && copies <= 1) {
    return pdfBytes;
  }

  // 2. Build print document with selected pages and copies
  const printDoc = await PDFDocument.create();
  const numCopies = Math.max(1, Math.min(99, copies || 1));

  for (let c = 0; c < numCopies; c++) {
    const copiedPages = await printDoc.copyPages(srcDoc, targetIndices);
    for (const page of copiedPages) {
      printDoc.addPage(page);
    }
  }

  return await printDoc.save({ useObjectStreams: true });
}
