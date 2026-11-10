import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractPdfFromDrop,
  extractPdfFromPaste,
  setupPwaLaunchQueue,
  openPdfViaPicker
} from '../../src/lib/fileOpen';

describe('Task 4.2: Open via picker, drag & drop, paste, and PWA launchQueue', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts PDF file from drag and drop event with application/pdf type', () => {
    const file = new File(['%PDF-1.4 sample'], 'invoice.pdf', { type: 'application/pdf' });
    const event = {
      dataTransfer: {
        files: [file],
        items: []
      }
    } as unknown as DragEvent;

    const extracted = extractPdfFromDrop(event);
    expect(extracted).not.toBeNull();
    expect(extracted?.name).toBe('invoice.pdf');
  });

  it('extracts PDF file from drag event by filename when mime type is missing', () => {
    const file = new File(['%PDF-1.4 content'], 'document.PDF', { type: '' });
    const event = {
      dataTransfer: {
        files: [file],
        items: []
      }
    } as unknown as DragEvent;

    const extracted = extractPdfFromDrop(event);
    expect(extracted).not.toBeNull();
    expect(extracted?.name).toBe('document.PDF');
  });

  it('ignores non-PDF files in drop event', () => {
    const file = new File(['image bytes'], 'picture.png', { type: 'image/png' });
    const event = {
      dataTransfer: {
        files: [file],
        items: []
      }
    } as unknown as DragEvent;

    const extracted = extractPdfFromDrop(event);
    expect(extracted).toBeNull();
  });

  it('extracts PDF file from clipboard paste event', () => {
    const file = new File(['%PDF-1.4 pasted'], 'pasted-document.pdf', {
      type: 'application/pdf'
    });
    const event = {
      clipboardData: {
        files: [file],
        items: []
      }
    } as unknown as ClipboardEvent;

    const extracted = extractPdfFromPaste(event);
    expect(extracted).not.toBeNull();
    expect(extracted?.name).toBe('pasted-document.pdf');
  });

  it('handles showOpenFilePicker when supported', async () => {
    const file = new File(['%PDF-1.4 file'], 'contract.pdf', { type: 'application/pdf' });
    const mockHandle = {
      getFile: vi.fn().mockResolvedValue(file)
    } as unknown as FileSystemFileHandle;

    const originalPicker = (window as unknown as { showOpenFilePicker?: unknown })
      .showOpenFilePicker;
    (window as unknown as { showOpenFilePicker: unknown }).showOpenFilePicker = vi
      .fn()
      .mockResolvedValue([mockHandle]);

    const result = await openPdfViaPicker();
    expect(result).not.toBeNull();
    expect(result?.file.name).toBe('contract.pdf');
    expect(result?.handle).toBe(mockHandle);

    (window as unknown as { showOpenFilePicker: unknown }).showOpenFilePicker = originalPicker;
  });

  it('gracefully handles user cancelling showOpenFilePicker', async () => {
    const abortErr = new Error('User cancelled');
    abortErr.name = 'AbortError';

    const originalPicker = (window as unknown as { showOpenFilePicker?: unknown })
      .showOpenFilePicker;
    (window as unknown as { showOpenFilePicker: unknown }).showOpenFilePicker = vi
      .fn()
      .mockRejectedValue(abortErr);

    const result = await openPdfViaPicker();
    expect(result).toBeNull();

    (window as unknown as { showOpenFilePicker: unknown }).showOpenFilePicker = originalPicker;
  });

  it('sets up PWA launchQueue consumer when supported', async () => {
    let consumerFn: ((params: { files: FileSystemFileHandle[] }) => Promise<void>) | null = null;
    const windowWithLQ = window as unknown as {
      launchQueue?: {
        setConsumer: (fn: (params: { files: FileSystemFileHandle[] }) => Promise<void>) => void;
      };
    };

    windowWithLQ.launchQueue = {
      setConsumer: (fn) => {
        consumerFn = fn;
      }
    };

    const onFileOpened = vi.fn();
    const cleanup = setupPwaLaunchQueue(onFileOpened);
    expect(typeof consumerFn).toBe('function');

    const file = new File(['%PDF-1.4 pwa'], 'launch.pdf', { type: 'application/pdf' });
    const mockHandle = {
      getFile: vi.fn().mockResolvedValue(file)
    } as unknown as FileSystemFileHandle;

    await consumerFn!({ files: [mockHandle] });
    expect(onFileOpened).toHaveBeenCalledWith(
      expect.objectContaining({
        file: expect.objectContaining({ name: 'launch.pdf' })
      })
    );

    cleanup();
    delete windowWithLQ.launchQueue;
  });
});
