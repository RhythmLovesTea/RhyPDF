/**
 * File Open Manager
 * Unified file opening via showOpenFilePicker (with input fallback), drag & drop,
 * clipboard paste, and PWA launchQueue.
 */

import { logger } from './logger';

export interface OpenedFileInfo {
  file: File;
  handle: FileSystemFileHandle | null;
  bytes: ArrayBuffer;
}

/**
 * Opens a PDF using window.showOpenFilePicker if available, falling back to a hidden file input.
 */
export async function openPdfViaPicker(): Promise<OpenedFileInfo | null> {
  const windowWithFSA = window as unknown as {
    showOpenFilePicker?: (options: unknown) => Promise<FileSystemFileHandle[]>;
  };

  // 1. Try File System Access API
  if (typeof windowWithFSA.showOpenFilePicker === 'function') {
    try {
      const handles = await windowWithFSA.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'PDF Documents',
            accept: {
              'application/pdf': ['.pdf']
            }
          }
        ]
      });

      if (!handles || handles.length === 0) return null;
      const handle = handles[0]!;
      const file = await handle.getFile();
      const bytes = await file.arrayBuffer();
      logger.info(
        'FileOpen',
        `Opened file via showOpenFilePicker: ${file.name} (${bytes.byteLength} bytes)`
      );
      return { file, handle, bytes };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled picker
        return null;
      }
      logger.warn('FileOpen', 'showOpenFilePicker failed, falling back to input', err);
    }
  }

  // 2. Hidden input fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.style.display = 'none';

    let resolved = false;

    const cleanup = () => {
      if (input.parentNode) {
        document.body.removeChild(input);
      }
    };

    input.onchange = async () => {
      if (resolved) return;
      resolved = true;
      const files = input.files;
      if (!files || files.length === 0) {
        cleanup();
        resolve(null);
        return;
      }

      const file = files[0]!;
      try {
        const bytes = await file.arrayBuffer();
        logger.info(
          'FileOpen',
          `Opened file via fallback input: ${file.name} (${bytes.byteLength} bytes)`
        );
        cleanup();
        resolve({ file, handle: null, bytes });
      } catch (err) {
        logger.error('FileOpen', 'Failed to read file from input', err);
        cleanup();
        resolve(null);
      }
    };

    // Cancel detection via window focus
    const onWindowFocus = () => {
      setTimeout(() => {
        if (!resolved && (!input.files || input.files.length === 0)) {
          resolved = true;
          window.removeEventListener('focus', onWindowFocus);
          cleanup();
          resolve(null);
        }
      }, 500);
    };

    window.addEventListener('focus', onWindowFocus, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Extracts a PDF file from a drag event.
 */
export function extractPdfFromDrop(event: DragEvent): File | null {
  const dt = event.dataTransfer;
  if (!dt) return null;

  if (dt.files && dt.files.length > 0) {
    for (let i = 0; i < dt.files.length; i++) {
      const file = dt.files[i]!;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        return file;
      }
    }
  }

  if (dt.items && dt.items.length > 0) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i]!;
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
          return file;
        }
      }
    }
  }

  return null;
}

/**
 * Extracts a PDF file from a paste clipboard event.
 */
export function extractPdfFromPaste(event: ClipboardEvent): File | null {
  const cd = event.clipboardData;
  if (!cd) return null;

  if (cd.files && cd.files.length > 0) {
    for (let i = 0; i < cd.files.length; i++) {
      const file = cd.files[i]!;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        return file;
      }
    }
  }

  if (cd.items && cd.items.length > 0) {
    for (let i = 0; i < cd.items.length; i++) {
      const item = cd.items[i]!;
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
          return file;
        }
      }
    }
  }

  return null;
}

/**
 * Sets up PWA launchQueue consumer for opening files associated with RhyPDF.
 */
export function setupPwaLaunchQueue(onFileOpened: (opened: OpenedFileInfo) => void): () => void {
  const windowWithLaunchQueue = window as unknown as {
    launchQueue?: {
      setConsumer: (
        consumer: (launchParams: { files: FileSystemFileHandle[] }) => Promise<void> | void
      ) => void;
    };
  };

  if (
    typeof windowWithLaunchQueue.launchQueue !== 'undefined' &&
    typeof windowWithLaunchQueue.launchQueue.setConsumer === 'function'
  ) {
    logger.info('FileOpen', 'PWA launchQueue is supported, setting up consumer');
    windowWithLaunchQueue.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files || launchParams.files.length === 0) return;
      try {
        const handle = launchParams.files[0]!;
        const file = await handle.getFile();
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const bytes = await file.arrayBuffer();
          onFileOpened({ file, handle, bytes });
        }
      } catch (err) {
        logger.error('FileOpen', 'Failed to consume launchQueue file', err);
      }
    });

    return () => {
      // Clean up consumer if supported
      try {
        windowWithLaunchQueue.launchQueue?.setConsumer(() => {});
      } catch {
        // Ignore
      }
    };
  }

  return () => {};
}
