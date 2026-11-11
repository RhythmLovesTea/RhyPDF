import { PDFDocument, degrees } from 'pdf-lib';
import { zipSync } from 'fflate';
import type { Rect } from '@rhypdf/pdf-model';
import type { ImagesToPdfOptions, PageSizePreset, SplitPdfOptions, SplitResultFile } from './types';
import { PAGE_SIZE_PRESETS } from './types';

function toUint8Array(data: Uint8Array | ArrayBuffer): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

/**
 * Parses page range strings like "1, 3-5, 8" into zero-based unique sorted page indices.
 * 1-indexed in UI -> 0-indexed in code.
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim() || totalPages <= 0) {
    return [];
  }

  const result = new Set<number>();
  const parts = rangeStr
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.toLowerCase() === 'all') {
      for (let i = 0; i < totalPages; i++) result.add(i);
      continue;
    }

    const rangeMatch = part.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
    if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      const min = Math.max(1, Math.min(start, end));
      const max = Math.min(totalPages, Math.max(start, end));
      for (let p = min; p <= max; p++) {
        result.add(p - 1);
      }
      continue;
    }

    const single = parseInt(part, 10);
    if (!isNaN(single) && single >= 1 && single <= totalPages) {
      result.add(single - 1);
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Rotates specified pages in 90 degree increments.
 */
export async function rotatePagesInPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  pageIndices: number[],
  angleDelta: number
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(toUint8Array(pdfBytes));
  const total = doc.getPageCount();
  const targets =
    pageIndices.length === 0 ? Array.from({ length: total }, (_, i) => i) : pageIndices;

  for (const idx of targets) {
    if (idx >= 0 && idx < total) {
      const page = doc.getPage(idx);
      const current = page.getRotation().angle;
      const next = (((current + angleDelta) % 360) + 360) % 360;
      page.setRotation(degrees(next));
    }
  }

  return doc.save();
}

/**
 * Deletes specified pages from PDF.
 * Throws an error if attempting to delete all pages.
 */
export async function deletePagesFromPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  pageIndices: number[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(toUint8Array(pdfBytes));
  const total = doc.getPageCount();
  const toDelete = Array.from(new Set(pageIndices))
    .filter((idx) => idx >= 0 && idx < total)
    .sort((a, b) => b - a); // remove from highest index first

  if (toDelete.length >= total) {
    throw new Error('Cannot delete all pages from PDF: at least one page must remain.');
  }

  for (const idx of toDelete) {
    doc.removePage(idx);
  }

  return doc.save();
}

/**
 * Inserts a blank page into the PDF at targetIndex with given dimensions.
 */
export async function insertBlankPageInPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  targetIndex: number,
  width: number,
  height: number
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(toUint8Array(pdfBytes));
  const total = doc.getPageCount();
  const clampedIndex = Math.max(0, Math.min(targetIndex, total));
  doc.insertPage(clampedIndex, [width, height]);
  return doc.save();
}

/**
 * Duplicates a page in the PDF and inserts it at targetIndex (defaults to immediately after).
 */
export async function duplicatePageInPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  pageIndex: number,
  targetIndex?: number
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(toUint8Array(pdfBytes));
  const total = doc.getPageCount();
  if (pageIndex < 0 || pageIndex >= total) {
    throw new Error(`Invalid page index to duplicate: ${pageIndex}`);
  }

  const [copied] = await doc.copyPages(doc, [pageIndex]);
  const insertAt =
    targetIndex !== undefined ? Math.max(0, Math.min(targetIndex, total)) : pageIndex + 1;
  doc.insertPage(insertAt, copied);
  return doc.save();
}

/**
 * Reorders pages in the PDF into newOrder array of page indices.
 */
export async function reorderPagesInPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  newOrder: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toUint8Array(pdfBytes));
  const total = srcDoc.getPageCount();

  if (newOrder.length !== total) {
    throw new Error(`New order length (${newOrder.length}) does not match page count (${total})`);
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, newOrder);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  return newDoc.save();
}

/**
 * Inserts pages from another source PDF into target PDF at targetIndex.
 */
export async function insertPagesFromOtherPdf(
  targetPdfBytes: Uint8Array | ArrayBuffer,
  sourcePdfBytes: Uint8Array | ArrayBuffer,
  sourcePageIndices: number[],
  targetIndex: number
): Promise<Uint8Array> {
  const targetDoc = await PDFDocument.load(toUint8Array(targetPdfBytes));
  const sourceDoc = await PDFDocument.load(toUint8Array(sourcePdfBytes));
  const sourceTotal = sourceDoc.getPageCount();
  const targetTotal = targetDoc.getPageCount();

  const validSourceIndices = sourcePageIndices.filter((i) => i >= 0 && i < sourceTotal);
  if (validSourceIndices.length === 0) {
    return targetDoc.save();
  }

  const copiedPages = await targetDoc.copyPages(sourceDoc, validSourceIndices);
  const clampedInsertIndex = Math.max(0, Math.min(targetIndex, targetTotal));

  for (let i = 0; i < copiedPages.length; i++) {
    targetDoc.insertPage(clampedInsertIndex + i, copiedPages[i]);
  }

  return targetDoc.save();
}

/**
 * Merges multiple PDFs into one document.
 */
export async function mergeMultiplePdfs(
  pdfList: Array<{ bytes: Uint8Array | ArrayBuffer; name?: string }>
): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const item of pdfList) {
    const srcDoc = await PDFDocument.load(toUint8Array(item.bytes));
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
  }

  return mergedDoc.save();
}

/**
 * Extracts specified pages into a new standalone PDF.
 */
export async function extractPagesFromPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  pageIndices: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(toUint8Array(pdfBytes));
  const total = srcDoc.getPageCount();
  const validIndices = pageIndices.filter((i) => i >= 0 && i < total);

  if (validIndices.length === 0) {
    throw new Error('No valid pages selected for extraction.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  return newDoc.save();
}

/**
 * Splits a PDF by ranges, every N pages, by selection, or by bookmarks.
 */
export async function splitPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  options: SplitPdfOptions
): Promise<SplitResultFile[]> {
  const srcDoc = await PDFDocument.load(toUint8Array(pdfBytes));
  const total = srcDoc.getPageCount();
  const results: SplitResultFile[] = [];

  const groups: number[][] = [];

  if (options.mode === 'everyN') {
    const n = Math.max(1, options.everyN ?? 1);
    for (let i = 0; i < total; i += n) {
      const group: number[] = [];
      for (let j = i; j < Math.min(i + n, total); j++) {
        group.push(j);
      }
      groups.push(group);
    }
  } else if (options.mode === 'ranges' && options.ranges) {
    const rangeStrings = options.ranges
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const r of rangeStrings) {
      const indices = parsePageRange(r, total);
      if (indices.length > 0) groups.push(indices);
    }
    if (groups.length === 0) {
      const allIndices = parsePageRange(options.ranges, total);
      if (allIndices.length > 0) groups.push(allIndices);
    }
  } else if (
    options.mode === 'selection' &&
    options.selectedPages &&
    options.selectedPages.length > 0
  ) {
    const selected = options.selectedPages.filter((i) => i >= 0 && i < total);
    if (selected.length > 0) groups.push(selected);
  } else if (options.mode === 'bookmarks' && options.bookmarks && options.bookmarks.length > 0) {
    const sortedBookmarks = [...options.bookmarks].sort((a, b) => a.pageIndex - b.pageIndex);
    for (let b = 0; b < sortedBookmarks.length; b++) {
      const currentBm = sortedBookmarks[b];
      if (!currentBm) continue;
      const start = currentBm.pageIndex;
      const nextBm = sortedBookmarks[b + 1];
      const end = nextBm ? nextBm.pageIndex : total;
      const group: number[] = [];
      for (let p = start; p < end && p < total; p++) {
        group.push(p);
      }
      if (group.length > 0) groups.push(group);
    }
  }

  if (groups.length === 0) {
    // fallback: split every 1 page
    for (let i = 0; i < total; i++) {
      groups.push([i]);
    }
  }

  for (let idx = 0; idx < groups.length; idx++) {
    const pageGroup = groups[idx];
    if (!pageGroup || pageGroup.length === 0) continue;
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pageGroup);
    for (const p of copiedPages) {
      newDoc.addPage(p);
    }
    const bytes = await newDoc.save();
    results.push({
      filename: `document_part_${idx + 1}.pdf`,
      bytes,
      pageCount: pageGroup.length
    });
  }

  return results;
}

/**
 * Sets CropBox on a specific page in points.
 */
export async function cropPageInPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  pageIndex: number,
  cropBox: Rect
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(toUint8Array(pdfBytes));
  const total = doc.getPageCount();
  if (pageIndex < 0 || pageIndex >= total) {
    throw new Error(`Invalid page index for crop: ${pageIndex}`);
  }

  const page = doc.getPage(pageIndex);
  const width = Math.max(1, cropBox.right - cropBox.left);
  const height = Math.max(1, cropBox.top - cropBox.bottom);
  page.setCropBox(cropBox.left, cropBox.bottom, width, height);

  return doc.save();
}

/**
 * Resizes a page to target width and height, with optional content scaling.
 */
export async function resizePageInPdf(
  pdfBytes: Uint8Array | ArrayBuffer,
  pageIndex: number,
  width: number,
  height: number,
  scaleContent = false
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(toUint8Array(pdfBytes));
  const total = doc.getPageCount();
  if (pageIndex < 0 || pageIndex >= total) {
    throw new Error(`Invalid page index for resize: ${pageIndex}`);
  }

  const page = doc.getPage(pageIndex);
  const oldWidth = page.getWidth();
  const oldHeight = page.getHeight();

  if (scaleContent && oldWidth > 0 && oldHeight > 0) {
    const scaleX = width / oldWidth;
    const scaleY = height / oldHeight;
    page.scale(scaleX, scaleY);
  } else {
    page.setSize(width, height);
  }

  return doc.save();
}

/**
 * Converts multiple images into a multi-page PDF document.
 */
export async function imagesToPdf(options: ImagesToPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const margin = options.margin ?? 20;

  for (const img of options.images) {
    const embedded =
      img.format === 'png'
        ? await doc.embedPng(toUint8Array(img.data))
        : await doc.embedJpg(toUint8Array(img.data));

    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSize && options.pageSize !== 'Custom') {
      const preset = PAGE_SIZE_PRESETS[options.pageSize as Exclude<PageSizePreset, 'Custom'>];
      if (options.orientation === 'landscape') {
        pageWidth = Math.max(preset.width, preset.height);
        pageHeight = Math.min(preset.width, preset.height);
      } else {
        pageWidth = Math.min(preset.width, preset.height);
        pageHeight = Math.max(preset.width, preset.height);
      }
    } else if (options.customWidth && options.customHeight) {
      pageWidth = options.customWidth;
      pageHeight = options.customHeight;
    } else {
      // Fit to image dimensions + margins
      pageWidth = embedded.width + margin * 2;
      pageHeight = embedded.height + margin * 2;
    }

    const page = doc.addPage([pageWidth, pageHeight]);

    // Calculate image fitting inside printable area
    const availWidth = Math.max(10, pageWidth - margin * 2);
    const availHeight = Math.max(10, pageHeight - margin * 2);
    const scale = Math.min(availWidth / embedded.width, availHeight / embedded.height, 1.0);
    const renderWidth = embedded.width * scale;
    const renderHeight = embedded.height * scale;

    const x = margin + (availWidth - renderWidth) / 2;
    const y = margin + (availHeight - renderHeight) / 2;

    page.drawImage(embedded, {
      x,
      y,
      width: renderWidth,
      height: renderHeight
    });
  }

  return doc.save();
}

/**
 * Bundles files into an in-memory ZIP archive using fflate.
 */
export function zipFiles(files: Array<{ name: string; bytes: Uint8Array }>): Uint8Array {
  const archive: Record<string, Uint8Array> = {};
  for (const f of files) {
    archive[f.name] = f.bytes;
  }
  return zipSync(archive);
}
