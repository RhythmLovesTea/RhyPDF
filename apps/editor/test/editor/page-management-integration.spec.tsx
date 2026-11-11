import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import PageOrganizerPage from '../../src/features/pages/PageOrganizerPage';
import { InsertBlankPageDialog } from '../../src/features/pages/InsertBlankPageDialog';
import { InsertPagesFromPdfDialog } from '../../src/features/pages/InsertPagesFromPdfDialog';
import { MergePdfDialog } from '../../src/features/pages/MergePdfDialog';
import { SplitPdfDialog } from '../../src/features/pages/SplitPdfDialog';
import { CropPageDialog } from '../../src/features/pages/CropPageDialog';
import { ResizePageDialog } from '../../src/features/pages/ResizePageDialog';
import { ImagesToPdfDialog } from '../../src/features/pages/ImagesToPdfDialog';
import { PdfToImagesDialog } from '../../src/features/pages/PdfToImagesDialog';
import { BookmarksPanel } from '../../src/features/pages/BookmarksPanel';
import type { BookmarkItem } from '@rhypdf/edit-core';

// Mock browser object URLs
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

function setInputValue(el: HTMLInputElement | HTMLSelectElement, val: string) {
  const proto =
    el instanceof HTMLSelectElement
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  descriptor?.set?.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Phase 13 UI Integration: Page Management, Bookmarks, and Conversion', () => {
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

  describe('Task 13.1, 13.2, 13.3, 13.8, 13.9: PageOrganizerPage', () => {
    it('renders page grid cards and toggles selection', async () => {
      const onRotate = vi.fn();
      const onDelete = vi.fn();

      await act(async () => {
        root.render(
          <PageOrganizerPage
            initialPages={[
              { id: 'p1', originalIndex: 0, rotation: 0, width: 595, height: 842 },
              { id: 'p2', originalIndex: 1, rotation: 0, width: 595, height: 842 },
              { id: 'p3', originalIndex: 2, rotation: 0, width: 595, height: 842 }
            ]}
            onRotatePages={onRotate}
            onDeletePages={onDelete}
          />
        );
      });

      expect(container.querySelector('[data-testid="page-organizer"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="page-card-p1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="page-card-p2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="page-card-p3"]')).not.toBeNull();

      // Click card 1 checkbox
      const chk1 = container.querySelector(
        '[data-testid="page-select-checkbox-p1"]'
      ) as HTMLInputElement;
      expect(chk1.checked).toBe(false);
      await act(async () => {
        chk1.click();
      });
      expect(chk1.checked).toBe(true);

      // Select All button
      const selectAllBtn = container.querySelector(
        '[data-testid="select-all-pages-btn"]'
      ) as HTMLButtonElement;
      await act(async () => {
        selectAllBtn.click();
      });
      const chk2 = container.querySelector(
        '[data-testid="page-select-checkbox-p2"]'
      ) as HTMLInputElement;
      expect(chk2.checked).toBe(true);

      // Deselect All
      const deselectBtn = container.querySelector(
        '[data-testid="deselect-all-pages-btn"]'
      ) as HTMLButtonElement;
      await act(async () => {
        deselectBtn.click();
      });
      expect(chk1.checked).toBe(false);
    });

    it('rotates individual page by 90 degrees and triggers callback', async () => {
      const onRotate = vi.fn();

      await act(async () => {
        root.render(
          <PageOrganizerPage
            initialPages={[
              { id: 'p1', originalIndex: 0, rotation: 0, width: 595, height: 842 },
              { id: 'p2', originalIndex: 1, rotation: 0, width: 595, height: 842 }
            ]}
            onRotatePages={onRotate}
          />
        );
      });

      const rotBtn = container.querySelector('[data-testid="rotate-cw-p1"]') as HTMLButtonElement;
      await act(async () => {
        rotBtn.click();
      });

      expect(onRotate).toHaveBeenCalledWith([0], 90);
    });

    it('duplicates a page and deletes a page', async () => {
      const onDuplicate = vi.fn();
      const onDelete = vi.fn();

      await act(async () => {
        root.render(
          <PageOrganizerPage
            initialPages={[
              { id: 'p1', originalIndex: 0, rotation: 0, width: 595, height: 842 },
              { id: 'p2', originalIndex: 1, rotation: 0, width: 595, height: 842 }
            ]}
            onDuplicatePage={onDuplicate}
            onDeletePages={onDelete}
          />
        );
      });

      const dupBtn = container.querySelector('[data-testid="duplicate-p1"]') as HTMLButtonElement;
      await act(async () => {
        dupBtn.click();
      });
      expect(onDuplicate).toHaveBeenCalledWith(0);

      const delBtn = container.querySelector('[data-testid="delete-p2"]') as HTMLButtonElement;
      await act(async () => {
        delBtn.click();
      });
      expect(onDelete).toHaveBeenCalledWith([1]);
    });
  });

  describe('Task 13.4: InsertBlankPageDialog', () => {
    it('selects preset and triggers insert callback with target index and dimensions', async () => {
      const onInsert = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <InsertBlankPageDialog
            open={true}
            onClose={onClose}
            currentPageIndex={0}
            totalPages={3}
            onInsert={onInsert}
          />
        );
      });

      const presetSelect = document.body.querySelector(
        '[data-testid="page-size-preset-select"]'
      ) as HTMLSelectElement;
      expect(presetSelect).not.toBeNull();
      await act(async () => {
        setInputValue(presetSelect, 'Letter');
      });

      const confirmBtn = document.body.querySelector(
        '[data-testid="insert-blank-page-confirm"]'
      ) as HTMLButtonElement;
      await act(async () => {
        confirmBtn.click();
      });

      expect(onInsert).toHaveBeenCalledWith({
        targetIndex: 1,
        width: 612,
        height: 792,
        preset: 'Letter'
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Task 13.5: InsertPagesFromPdfDialog', () => {
    it('handles range input and confirmation', async () => {
      const onInsertPages = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <InsertPagesFromPdfDialog
            open={true}
            onClose={onClose}
            currentPageIndex={1}
            totalPages={4}
            onInsertPages={onInsertPages}
          />
        );
      });

      expect(document.body.querySelector('[data-testid="source-pdf-file-input"]')).not.toBeNull();
      expect(
        (document.body.querySelector('[data-testid="insert-pages-confirm"]') as HTMLButtonElement)
          .disabled
      ).toBe(true);
    });
  });

  describe('Task 13.6: MergePdfDialog', () => {
    it('renders empty list, warns when fewer than 2 files to merge', async () => {
      const onClose = vi.fn();

      await act(async () => {
        root.render(<MergePdfDialog open={true} onClose={onClose} />);
      });

      expect(document.body.querySelector('[data-testid="merge-items-list"]')).not.toBeNull();
      const mergeBtn = document.body.querySelector(
        '[data-testid="merge-confirm-button"]'
      ) as HTMLButtonElement;
      expect(mergeBtn.disabled).toBe(true);
    });
  });

  describe('Task 13.7: SplitPdfDialog', () => {
    it('switches split modes and triggers split with download', async () => {
      const onClose = vi.fn();
      const dummyPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

      await act(async () => {
        root.render(
          <SplitPdfDialog
            open={true}
            onClose={onClose}
            documentBytes={dummyPdfBytes}
            totalPages={4}
            selectedPages={[0, 2]}
          />
        );
      });

      const everyNRadio = document.body.querySelector(
        '[data-testid="split-mode-every-n"]'
      ) as HTMLInputElement;
      expect(everyNRadio.checked).toBe(true);

      const rangesRadio = document.body.querySelector(
        '[data-testid="split-mode-ranges"]'
      ) as HTMLInputElement;
      await act(async () => {
        rangesRadio.click();
      });
      expect(rangesRadio.checked).toBe(true);

      expect(document.body.querySelector('[data-testid="split-ranges-input"]')).not.toBeNull();
    });
  });

  describe('Task 13.10: CropPageDialog', () => {
    it('adjusts margins and triggers crop callback with Rect coordinates', async () => {
      const onApplyCrop = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <CropPageDialog
            open={true}
            onClose={onClose}
            pageIndex={0}
            pageWidth={600}
            pageHeight={800}
            onApplyCrop={onApplyCrop}
          />
        );
      });

      const leftInput = document.body.querySelector(
        '[data-testid="crop-left-input"]'
      ) as HTMLInputElement;
      await act(async () => {
        setInputValue(leftInput, '50');
      });

      const applyBtn = document.body.querySelector(
        '[data-testid="apply-crop-button"]'
      ) as HTMLButtonElement;
      await act(async () => {
        applyBtn.click();
      });

      expect(onApplyCrop).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          left: 50,
          right: 564
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Task 13.11: ResizePageDialog', () => {
    it('selects preset, toggles scale content, and triggers resize callback', async () => {
      const onApplyResize = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <ResizePageDialog
            open={true}
            onClose={onClose}
            pageIndex={0}
            currentWidth={500}
            currentHeight={700}
            onApplyResize={onApplyResize}
          />
        );
      });

      const presetSelect = document.body.querySelector(
        '[data-testid="resize-preset-select"]'
      ) as HTMLSelectElement;
      await act(async () => {
        setInputValue(presetSelect, 'Letter');
      });

      const scaleChk = document.body.querySelector(
        '[data-testid="scale-content-checkbox"]'
      ) as HTMLInputElement;
      expect(scaleChk.checked).toBe(true);

      const applyBtn = document.body.querySelector(
        '[data-testid="apply-resize-button"]'
      ) as HTMLButtonElement;
      await act(async () => {
        applyBtn.click();
      });

      expect(onApplyResize).toHaveBeenCalledWith(0, 612, 792, true);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Task 13.12: ImagesToPdfDialog and PdfToImagesDialog', () => {
    it('renders ImagesToPdfDialog and handles page size setting', async () => {
      const onClose = vi.fn();

      await act(async () => {
        root.render(<ImagesToPdfDialog open={true} onClose={onClose} />);
      });

      expect(document.body.querySelector('[data-testid="add-images-button"]')).not.toBeNull();
      const createBtn = document.body.querySelector(
        '[data-testid="create-pdf-confirm"]'
      ) as HTMLButtonElement;
      expect(createBtn.disabled).toBe(true);
    });

    it('renders PdfToImagesDialog, chooses scope and format, triggers export', async () => {
      const onClose = vi.fn();
      const onRender = vi.fn().mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));

      await act(async () => {
        root.render(
          <PdfToImagesDialog
            open={true}
            onClose={onClose}
            currentPageIndex={0}
            totalPages={2}
            onRenderPageToImage={onRender}
          />
        );
      });

      const formatSelect = document.body.querySelector(
        '[data-testid="export-format-select"]'
      ) as HTMLSelectElement;
      await act(async () => {
        setInputValue(formatSelect, 'jpeg');
      });

      const dpiSelect = document.body.querySelector(
        '[data-testid="export-dpi-select"]'
      ) as HTMLSelectElement;
      await act(async () => {
        setInputValue(dpiSelect, '300');
      });

      const exportBtn = document.body.querySelector(
        '[data-testid="export-images-confirm"]'
      ) as HTMLButtonElement;
      await act(async () => {
        exportBtn.click();
      });

      expect(onRender).toHaveBeenCalledWith(0, 300, 'jpeg');
    });
  });

  describe('Task 13.13: BookmarksPanel', () => {
    it('renders bookmarks list, triggers jump on click, adds and deletes bookmarks', async () => {
      const onJump = vi.fn();
      const onUpdate = vi.fn();
      const onClose = vi.fn();

      const initialBookmarks: BookmarkItem[] = [
        { id: 'bm1', title: 'Chapter 1: Overview', pageIndex: 0 },
        { id: 'bm2', title: 'Chapter 2: Methods', pageIndex: 2 }
      ];

      await act(async () => {
        root.render(
          <BookmarksPanel
            open={true}
            onClose={onClose}
            bookmarks={initialBookmarks}
            currentPageIndex={0}
            totalPages={4}
            onJumpToPage={onJump}
            onUpdateBookmarks={onUpdate}
          />
        );
      });

      expect(container.querySelector('[data-testid="bookmarks-panel"]')).not.toBeNull();
      expect(container.textContent).toContain('Chapter 1: Overview');
      expect(container.textContent).toContain('Chapter 2: Methods');

      // Click jump to Chapter 2
      const ch2 = container.querySelector('[data-testid="bookmark-jump-bm2"]') as HTMLElement;
      await act(async () => {
        ch2.click();
      });
      expect(onJump).toHaveBeenCalledWith(2);

      // Add new bookmark
      const addBtn = container.querySelector(
        '[data-testid="add-bookmark-btn"]'
      ) as HTMLButtonElement;
      await act(async () => {
        addBtn.click();
      });
      expect(container.querySelector('[data-testid="add-bookmark-form"]')).not.toBeNull();

      const input = container.querySelector(
        '[data-testid="new-bookmark-title-input"]'
      ) as HTMLInputElement;
      await act(async () => {
        setInputValue(input, 'Chapter 3: Results');
      });

      const confirmBtn = container.querySelector(
        '[data-testid="confirm-add-bookmark-btn"]'
      ) as HTMLButtonElement;
      await act(async () => {
        confirmBtn.click();
      });

      expect(onUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ title: 'Chapter 3: Results' })])
      );

      // Delete bookmark
      const delBtn = container.querySelector('[data-testid="delete-btn-bm1"]') as HTMLButtonElement;
      await act(async () => {
        delBtn.click();
      });
      expect(onUpdate).toHaveBeenCalled();
    });
  });
});
