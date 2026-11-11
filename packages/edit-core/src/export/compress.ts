import { PDFDocument } from 'pdf-lib';
import type { CompressPdfOptions, CompressResult, ExportOptions } from './types';

/**
 * Compresses a PDF document by purging unreferenced objects, dead dictionaries,
 * re-packing streams into object streams, and optionally stripping metadata (Task 14.10).
 */
export async function compressPdf(
  pdfBytes: Uint8Array,
  options: CompressPdfOptions = {}
): Promise<CompressResult> {
  const { removeMetadata = true, useObjectStreams = true } = options;
  const originalSize = pdfBytes.byteLength;

  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const cleanDoc = await PDFDocument.create();

  // Copy all pages into a brand new document context
  const pageIndices = srcDoc.getPageIndices();
  if (pageIndices.length > 0) {
    const copiedPages = await cleanDoc.copyPages(srcDoc, pageIndices);
    for (const page of copiedPages) {
      cleanDoc.addPage(page);
    }
  }

  // Handle metadata
  if (removeMetadata) {
    cleanDoc.setTitle('');
    cleanDoc.setAuthor('');
    cleanDoc.setSubject('');
    cleanDoc.setKeywords([]);
    cleanDoc.setProducer('RhyPDF Optimizer');
    cleanDoc.setCreator('RhyPDF');
  } else {
    cleanDoc.setTitle(srcDoc.getTitle() || '');
    cleanDoc.setAuthor(srcDoc.getAuthor() || '');
    cleanDoc.setProducer(srcDoc.getProducer() || '');
  }

  const compressedBytes = await cleanDoc.save({
    useObjectStreams: useObjectStreams !== false
  });

  const compressedSize = compressedBytes.byteLength;
  const savingsRatio = originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0;
  const savingsPercent = Math.round(savingsRatio * 100);

  return {
    bytes: compressedBytes,
    originalSize,
    compressedSize,
    savingsRatio,
    savingsPercent
  };
}

/**
 * Estimates the final export size based on active options (Task 14.10).
 */
export function estimateExportSize(
  currentSize: number,
  options: ExportOptions | CompressPdfOptions = {}
): number {
  if (currentSize <= 0) return 0;

  let multiplier = 1.0;

  if ('optimizeSize' in options && options.optimizeSize) {
    multiplier *= 0.85; // Object streams typically save ~10-20%
  }
  if ('flattenAnnotations' in options && options.flattenAnnotations) {
    multiplier *= 0.98;
  }
  if ('flattenForms' in options && options.flattenForms) {
    multiplier *= 0.95;
  }
  if ('quality' in options) {
    if (options.quality === 'low') multiplier *= 0.60;
    else if (options.quality === 'medium') multiplier *= 0.75;
    else if (options.quality === 'high') multiplier *= 0.90;
    else if (typeof options.quality === 'number') {
      multiplier *= Math.max(0.4, Math.min(1.0, options.quality));
    }
  }

  return Math.round(currentSize * multiplier);
}
