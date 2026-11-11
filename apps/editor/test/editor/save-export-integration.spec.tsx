import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import {
  ConfirmSaveOriginalDialog,
  ExportOptionsDialog,
  CompressPdfDialog,
  PrintDialog,
  SaveProgressModal,
  UnsavedChangesDialog,
  VersionHistoryDialog
} from '../../src/features/export';
import {
  saveToOriginalFile,
  downloadPdfCopy,
  sharePdfFile,
  printPdfDocument,
  runWithSaveProgress
} from '../../src/lib/fileSave';
import {
  saveDocumentVersion,
  getDocumentVersions,
  restoreDocumentVersion,
  deleteDocumentVersion,
  clearDocumentVersions,
  isVersionHistoryEnabled,
  setVersionHistoryEnabled
} from '../../src/lib/versionHistory';
import { EditorTopBar } from '../../src/features/editor/EditorTopBar';
import { useDocStore } from '../../src/stores/docStore';
import { PDFDocument } from 'pdf-lib';

// Mock browser APIs
global.URL.createObjectURL = vi.fn(() => 'blob:mock-export-url');
global.URL.revokeObjectURL = vi.fn();

async function createSimplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([400, 600]);
  return await doc.save();
}

describe('Phase 14 UI Integration: Save, Export, Share, Print', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('Task 14.1: ConfirmSaveOriginalDialog & saveToOriginalFile', () => {
    it('renders save original confirmation dialog and triggers save original callback', async () => {
      const onSaveOriginal = vi.fn();
      const onDownloadCopy = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <ConfirmSaveOriginalDialog
            isOpen={true}
            filename="my-report.pdf"
            onClose={onClose}
            onSaveOriginal={onSaveOriginal}
            onDownloadCopy={onDownloadCopy}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-confirm-save-original"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('my-report.pdf');

      const btnSave = document.querySelector('[data-testid="btn-save-confirm"]') as HTMLButtonElement;
      expect(btnSave).not.toBeNull();
      act(() => {
        btnSave.click();
      });
      expect(onSaveOriginal).toHaveBeenCalledTimes(1);

      const btnCopy = document.querySelector('[data-testid="btn-save-as-copy"]') as HTMLButtonElement;
      act(() => {
        btnCopy.click();
      });
      expect(onDownloadCopy).toHaveBeenCalledTimes(1);
    });

    it('validates and writes atomically to a FileSystemFileHandle', async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      };
      const mockHandle = {
        createWritable: vi.fn().mockResolvedValue(mockWritable)
      } as unknown as FileSystemFileHandle;

      const pdfBytes = await createSimplePdf();
      const result = await saveToOriginalFile(mockHandle, pdfBytes, 1);

      expect(result.success).toBe(true);
      expect(mockHandle.createWritable).toHaveBeenCalledWith({ keepExistingData: false });
      expect(mockWritable.write).toHaveBeenCalledWith(pdfBytes);
      expect(mockWritable.close).toHaveBeenCalledTimes(1);
    });

    it('rejects corrupt bytes before write and prevents file corruption (Task 14.7)', async () => {
      const mockWritable = {
        write: vi.fn(),
        close: vi.fn()
      };
      const mockHandle = {
        createWritable: vi.fn().mockResolvedValue(mockWritable)
      } as unknown as FileSystemFileHandle;

      const corruptBytes = new Uint8Array([1, 2, 3, 4]);
      const result = await saveToOriginalFile(mockHandle, corruptBytes, 1);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockHandle.createWritable).not.toHaveBeenCalled();
    });
  });

  describe('Task 14.2: downloadPdfCopy with smart file names', () => {
    it('downloads copy with smart name e.g. document-edited.pdf', async () => {
      const pdfBytes = await createSimplePdf();
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');

      const savedName = downloadPdfCopy(pdfBytes, 'project.pdf');
      expect(savedName).toBe('project-edited.pdf');
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Task 14.3: ExportOptionsDialog', () => {
    it('renders export options and fires onExport with user settings', async () => {
      const onExport = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <ExportOptionsDialog
            isOpen={true}
            currentFileSize={1024 * 500}
            onClose={onClose}
            onExport={onExport}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-export-options"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('PDF Export Options');

      const banner = document.querySelector('[data-testid="export-size-estimate-banner"]');
      expect(banner).not.toBeNull();

      // Toggle checkboxes
      const toggleFlattenAnnots = document.querySelector('[data-testid="toggle-flatten-annotations"]') as HTMLInputElement;
      act(() => {
        toggleFlattenAnnots.click();
      });

      const toggleFlattenForms = document.querySelector('[data-testid="toggle-flatten-forms"]') as HTMLInputElement;
      act(() => {
        toggleFlattenForms.click();
      });

      // Submit
      const btnExport = document.querySelector('[data-testid="btn-confirm-export"]') as HTMLButtonElement;
      act(() => {
        btnExport.click();
      });

      expect(onExport).toHaveBeenCalledWith(
        expect.objectContaining({
          flattenAnnotations: true,
          flattenForms: true,
          optimizeSize: true
        })
      );
    });
  });

  describe('Task 14.4: sharePdfFile', () => {
    it('uses navigator.share when available and returns shared', async () => {
      const pdfBytes = await createSimplePdf();
      const mockShare = vi.fn().mockResolvedValue(undefined);
      const mockCanShare = vi.fn().mockReturnValue(true);

      Object.defineProperty(navigator, 'share', { value: mockShare, configurable: true });
      Object.defineProperty(navigator, 'canShare', { value: mockCanShare, configurable: true });

      const result = await sharePdfFile(pdfBytes, 'share-doc.pdf');
      expect(result).toBe('shared');
      expect(mockShare).toHaveBeenCalled();
    });

    it('falls back to browser download when Web Share is unsupported', async () => {
      const pdfBytes = await createSimplePdf();
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });

      const result = await sharePdfFile(pdfBytes, 'share-doc.pdf');
      expect(result).toBe('downloaded');
    });
  });

  describe('Task 14.5: PrintDialog & printPdfDocument', () => {
    it('renders print dialog with page range options and copies', async () => {
      const onPrint = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <PrintDialog
            isOpen={true}
            pageCount={5}
            currentPageIndex={2}
            onClose={onClose}
            onPrint={onPrint}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-print"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('Total 5');

      const copiesInput = document.querySelector('[data-testid="input-print-copies"]') as HTMLInputElement;
      expect(copiesInput.value).toBe('1');

      const btnPrint = document.querySelector('[data-testid="btn-confirm-print"]') as HTMLButtonElement;
      act(() => {
        btnPrint.click();
      });

      expect(onPrint).toHaveBeenCalledWith({
        pageRange: 'all',
        copies: 1
      });
    });

    it('creates hidden iframe for printing', async () => {
      const pdfBytes = await createSimplePdf();
      const appendSpy = vi.spyOn(document.body, 'appendChild');

      await printPdfDocument(pdfBytes, 'doc.pdf');
      const iframeCall = appendSpy.mock.calls.find((c) => c[0] instanceof HTMLIFrameElement);
      expect(iframeCall).toBeDefined();
    });
  });

  describe('Task 14.6: SaveProgressModal & runWithSaveProgress', () => {
    it('renders progress bar and status message', async () => {
      const onCancel = vi.fn();

      await act(async () => {
        root.render(
          <SaveProgressModal
            isOpen={true}
            progress={75}
            statusMessage="Optimizing PDF..."
            onCancel={onCancel}
          />
        );
      });

      const modal = document.querySelector('[data-testid="modal-save-progress"]');
      expect(modal).not.toBeNull();

      const status = document.querySelector('[data-testid="text-save-progress-status"]');
      expect(status?.textContent).toContain('Optimizing PDF... (75%)');

      const progressBar = document.querySelector('[data-testid="save-progress-bar"]') as HTMLDivElement;
      expect(progressBar.style.width).toBe('75%');

      const btnCancel = document.querySelector('[data-testid="btn-cancel-save-progress"]') as HTMLButtonElement;
      act(() => {
        btnCancel.click();
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('reports incremental progress steps via runWithSaveProgress', async () => {
      const steps: string[] = [];
      const onProgress = vi.fn((_pct: number, msg: string) => {
        steps.push(msg);
      });

      const result = await runWithSaveProgress(async (report) => {
        report(60, 'Writing data');
        return 'success';
      }, onProgress);

      expect(result).toBe('success');
      expect(steps).toContain('Preparing document...');
      expect(steps).toContain('Encoding PDF objects...');
      expect(steps).toContain('Writing data');
      expect(steps).toContain('Done');
    });
  });

  describe('Task 14.8: UnsavedChangesDialog', () => {
    it('renders unsaved changes dialog and routes save / discard / stay', async () => {
      const onSave = vi.fn();
      const onDiscard = vi.fn();
      const onCancel = vi.fn();

      await act(async () => {
        root.render(
          <UnsavedChangesDialog
            isOpen={true}
            filename="quarterly_report.pdf"
            onSave={onSave}
            onDiscard={onDiscard}
            onCancel={onCancel}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-unsaved-changes"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('quarterly_report.pdf');

      const btnSave = document.querySelector('[data-testid="btn-unsaved-save"]') as HTMLButtonElement;
      act(() => {
        btnSave.click();
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      const btnDiscard = document.querySelector('[data-testid="btn-unsaved-discard"]') as HTMLButtonElement;
      act(() => {
        btnDiscard.click();
      });
      expect(onDiscard).toHaveBeenCalledTimes(1);

      const btnStay = document.querySelector('[data-testid="btn-unsaved-cancel"]') as HTMLButtonElement;
      act(() => {
        btnStay.click();
      });
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Task 14.9: VersionHistoryDialog & storage service', () => {
    it('saves, retrieves, restores, and deletes document versions', async () => {
      const docId = 'test-doc-versioning-123';
      const pdfBytes = await createSimplePdf();

      setVersionHistoryEnabled(true);
      expect(isVersionHistoryEnabled()).toBe(true);

      // Save version 1
      const v1 = await saveDocumentVersion(docId, 'report.pdf', pdfBytes, 'Initial Version');
      expect(v1).not.toBeNull();
      expect(v1?.versionNumber).toBe(1);

      // Save version 2
      const v2 = await saveDocumentVersion(docId, 'report.pdf', pdfBytes, 'Second Version');
      expect(v2?.versionNumber).toBe(2);

      // Retrieve versions
      const versions = await getDocumentVersions(docId);
      expect(versions.length).toBe(2);
      expect(versions[0]?.id).toBe(v2?.id);

      // Restore
      const restored = await restoreDocumentVersion(docId, v1!.id);
      expect(restored).not.toBeNull();
      expect(restored!.byteLength).toBe(pdfBytes.byteLength);

      // Delete one version
      await deleteDocumentVersion(docId, v1!.id);
      const afterDel = await getDocumentVersions(docId);
      expect(afterDel.length).toBe(1);

      // Clear all
      await clearDocumentVersions(docId);
      const afterClear = await getDocumentVersions(docId);
      expect(afterClear.length).toBe(0);
    });

    it('renders VersionHistoryDialog with version list and restore trigger', async () => {
      const docId = 'doc-ui-test-versions';
      const pdfBytes = await createSimplePdf();
      await saveDocumentVersion(docId, 'doc.pdf', pdfBytes, 'Saved checkpoint');

      const onRestore = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <VersionHistoryDialog
            isOpen={true}
            docId={docId}
            onClose={onClose}
            onRestore={onRestore}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-version-history"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('Version History');

      // Allow async loadVersions to populate
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      const restoreBtn = document.querySelector('[data-testid^="btn-restore-version-"]') as HTMLButtonElement;
      if (restoreBtn) {
        act(() => {
          restoreBtn.click();
        });
        await act(async () => {
          await new Promise((r) => setTimeout(r, 50));
        });
        expect(onRestore).toHaveBeenCalled();
      }

      await clearDocumentVersions(docId);
    });
  });

  describe('Task 14.10: CompressPdfDialog', () => {
    it('renders compression comparison and fires onCompress', async () => {
      const onCompress = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <CompressPdfDialog
            isOpen={true}
            currentFileSize={1024 * 1024 * 4} // 4MB
            onClose={onClose}
            onCompress={onCompress}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-compress-pdf"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('Compress PDF');

      const card = document.querySelector('[data-testid="compress-comparison-card"]');
      expect(card?.textContent).toContain('4.00 MB');

      // Select Extreme compression preset
      const presetExtreme = document.querySelector('[data-testid="preset-extreme"]') as HTMLLabelElement;
      act(() => {
        presetExtreme.click();
      });

      const btnConfirm = document.querySelector('[data-testid="btn-confirm-compress"]') as HTMLButtonElement;
      act(() => {
        btnConfirm.click();
      });

      expect(onCompress).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 'low',
          removeMetadata: true,
          useObjectStreams: true
        })
      );
    });
  });

  describe('EditorTopBar: Save & Export Actions Integration', () => {
    it('renders save/download button and dropdown menu with Phase 14 options', async () => {
      useDocStore.getState().setDoc('doc-topbar-test', 'contract.pdf', 3);

      const onDownload = vi.fn();
      const onSave = vi.fn();
      const onDownloadCopy = vi.fn();
      const onOpenExportOptions = vi.fn();
      const onOpenCompress = vi.fn();
      const onPrint = vi.fn();
      const onShare = vi.fn();
      const onOpenVersionHistory = vi.fn();

      await act(async () => {
        root.render(
          <EditorTopBar
            onBackToHome={vi.fn()}
            onDownload={onDownload}
            onSave={onSave}
            onDownloadCopy={onDownloadCopy}
            onOpenExportOptions={onOpenExportOptions}
            onOpenCompress={onOpenCompress}
            onPrint={onPrint}
            onShare={onShare}
            onOpenVersionHistory={onOpenVersionHistory}
            onToggleSearch={vi.fn()}
            onOpenCommandPalette={vi.fn()}
            onOpenShortcutsHelp={vi.fn()}
          />
        );
      });

      // Check Print and Share buttons in topbar
      const btnPrint = document.querySelector('[data-testid="btn-topbar-print"]') as HTMLButtonElement;
      expect(btnPrint).not.toBeNull();
      act(() => {
        btnPrint.click();
      });
      expect(onPrint).toHaveBeenCalledTimes(1);

      const btnShare = document.querySelector('[data-testid="btn-topbar-share"]') as HTMLButtonElement;
      expect(btnShare).not.toBeNull();
      act(() => {
        btnShare.click();
      });
      expect(onShare).toHaveBeenCalledTimes(1);

      // Open save dropdown menu
      const btnMenu = document.querySelector('[data-testid="btn-topbar-save-menu"]') as HTMLButtonElement;
      expect(btnMenu).not.toBeNull();
      act(() => {
        btnMenu.click();
      });

      const menu = document.querySelector('[data-testid="topbar-save-dropdown-menu"]');
      expect(menu).not.toBeNull();

      // Click Download a Copy
      const itemCopy = document.querySelector('[data-testid="menu-item-download-copy"]') as HTMLButtonElement;
      act(() => {
        itemCopy.click();
      });
      expect(onDownloadCopy).toHaveBeenCalledTimes(1);

      // Re-open menu to click Export Options
      act(() => {
        btnMenu.click();
      });
      const itemExport = document.querySelector('[data-testid="menu-item-export-options"]') as HTMLButtonElement;
      act(() => {
        itemExport.click();
      });
      expect(onOpenExportOptions).toHaveBeenCalledTimes(1);

      // Re-open menu to click Compress
      act(() => {
        btnMenu.click();
      });
      const itemCompress = document.querySelector('[data-testid="menu-item-compress"]') as HTMLButtonElement;
      act(() => {
        itemCompress.click();
      });
      expect(onOpenCompress).toHaveBeenCalledTimes(1);

      // Re-open menu to click Version History
      act(() => {
        btnMenu.click();
      });
      const itemVersions = document.querySelector('[data-testid="menu-item-version-history"]') as HTMLButtonElement;
      act(() => {
        itemVersions.click();
      });
      expect(onOpenVersionHistory).toHaveBeenCalledTimes(1);
    });
  });
});
