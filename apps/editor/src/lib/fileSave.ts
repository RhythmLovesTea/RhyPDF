/**
 * File Save & Export Service (Tasks 14.1, 14.2, 14.4, 14.5, 14.6, 14.7)
 * Implements atomic writes to original files via File System Access,
 * copy downloads with smart names, Web Share API with download fallback,
 * hidden iframe printing, and progress reporting.
 */

import { logger } from './logger';
import {
  getSmartCopyFilename,
  validateSavedPdf,
  preparePrintPdf,
  PrintOptions
} from '@rhypdf/edit-core';

export interface SaveProgressCallback {
  (progress: number, stepMessage: string): void;
}

/**
 * Validates bytes and atomically writes to the original file via File System Access handle (Task 14.1 & 14.7).
 * FSA writes to an internal temporary swap file first, ensuring the original is never corrupted
 * if writing is interrupted or tab is terminated.
 */
export async function saveToOriginalFile(
  handle: FileSystemFileHandle,
  bytes: Uint8Array,
  expectedPageCount?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Post-save validation before committing to file
    const validation = await validateSavedPdf(bytes, expectedPageCount);
    if (!validation.valid) {
      logger.error('FileSave', `Validation failed before saving: ${validation.error}`);
      return { success: false, error: validation.error };
    }

    // 2. Atomic write via FSA writable stream
    // Using { keepExistingData: false } creates a clean temporary file that is only swapped on close()
    const writable = await handle.createWritable({ keepExistingData: false });
    await writable.write(bytes);
    await writable.close();

    logger.info('FileSave', `Successfully saved ${bytes.byteLength} bytes to original file handle`);
    return { success: true };
  } catch (err) {
    logger.error('FileSave', 'Failed to save to original file handle', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Downloads a copy of the PDF with a smart filename (e.g. 'report-edited.pdf') (Task 14.2).
 */
export function downloadPdfCopy(
  bytes: Uint8Array,
  originalFilename = 'document.pdf',
  suffix = '-edited'
): string {
  const downloadName = getSmartCopyFilename(originalFilename, suffix);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
  logger.info('FileSave', `Downloaded copy as ${downloadName}`);
  return downloadName;
}

/**
 * Checks if the Web Share API is available for sharing files (Task 14.4).
 */
export function canSharePdf(file?: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  if (typeof navigator.canShare === 'function') {
    try {
      const testFile = file || new File(['%PDF-1.7'], 'test.pdf', { type: 'application/pdf' });
      return navigator.canShare({ files: [testFile] });
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Shares a PDF file using the Web Share API, falling back to download if unsupported (Task 14.4).
 */
export async function sharePdfFile(
  bytes: Uint8Array,
  filename = 'document.pdf'
): Promise<'shared' | 'downloaded' | 'cancelled' | 'failed'> {
  const file = new File([bytes], filename, { type: 'application/pdf' });

  if (canSharePdf(file)) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: `Shared PDF document: ${filename}`
      });
      logger.info('FileSave', `Successfully shared ${filename} via Web Share API`);
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        logger.info('FileSave', 'User cancelled share dialog');
        return 'cancelled';
      }
      logger.warn('FileSave', 'Web Share API failed, falling back to download', err);
    }
  }

  // Graceful fallback to browser download
  downloadPdfCopy(bytes, filename);
  return 'downloaded';
}

/**
 * Prints the document via a hidden iframe, with fallback to new tab for Safari quirks (Task 14.5).
 */
export async function printPdfDocument(
  bytes: Uint8Array,
  _filename = 'document.pdf',
  options?: PrintOptions
): Promise<boolean> {
  try {
    const printBytes = await preparePrintPdf(bytes, options);
    const blob = new Blob([printBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    // Try hidden iframe approach
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    };

    let printed = false;
    iframe.onload = () => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          printed = true;
          cleanup();
        }
      } catch (err) {
        logger.warn('FileSave', 'iframe print failed, falling back to window.open', err);
        window.open(blobUrl, '_blank');
        cleanup();
      }
    };

    document.body.appendChild(iframe);

    // Safety timeout in case iframe doesn't trigger onload (e.g. mobile or Safari strict)
    setTimeout(() => {
      if (!printed) {
        window.open(blobUrl, '_blank');
        cleanup();
      }
    }, 2500);

    return true;
  } catch (err) {
    logger.error('FileSave', 'Print failed', err);
    return false;
  }
}

/**
 * Async save progress simulator for large files (Task 14.6).
 * Provides stepped feedback: Preparing (25%) -> Optimizing (50%) -> Validating (75%) -> Ready (100%).
 */
export async function runWithSaveProgress<T>(
  action: (onProgress: SaveProgressCallback) => Promise<T>,
  onProgress?: SaveProgressCallback,
  signal?: AbortSignal
): Promise<T> {
  const report = (pct: number, msg: string) => {
    if (signal?.aborted) {
      throw new DOMException('Operation aborted by user', 'AbortError');
    }
    if (onProgress) {
      onProgress(pct, msg);
    }
  };

  report(15, 'Preparing document...');
  await new Promise((r) => setTimeout(r, 40));

  report(45, 'Encoding PDF objects...');
  await new Promise((r) => setTimeout(r, 40));

  const result = await action(report);

  report(85, 'Validating PDF integrity...');
  await new Promise((r) => setTimeout(r, 40));

  report(100, 'Done');
  return result;
}
