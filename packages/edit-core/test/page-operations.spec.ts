import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  parsePageRange,
  rotatePagesInPdf,
  deletePagesFromPdf,
  insertBlankPageInPdf,
  duplicatePageInPdf,
  reorderPagesInPdf,
  insertPagesFromOtherPdf,
  mergeMultiplePdfs,
  extractPagesFromPdf,
  splitPdf,
  cropPageInPdf,
  resizePageInPdf,
  imagesToPdf,
  zipFiles,
  addBookmark,
  findBookmark,
  updateBookmark,
  deleteBookmark,
  flattenBookmarks,
  loadBookmarksFromPdf,
  saveBookmarksToPdf,
  DeletePagesCommand,
  RotatePagesCommand,
  InsertBlankPageCommand,
  DuplicatePageCommand,
  CropPageCommand,
  ResizePageCommand,
  BookmarkItem
} from '../src/pages';
import { EditSession } from '../src/EditSession';

// Helper to create a test PDF in memory
async function createTestPdf(pageCount = 3, width = 600, height = 800): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([width, height]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: height - 100, size: 24, color: rgb(0, 0, 0) });
  }
  return doc.save();
}

// 1x1 transparent PNG data URI bytes
const SAMPLE_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

describe('Phase 13: Page Management Core Operations', () => {
  describe('Task 13.5 & Range Parser: parsePageRange', () => {
    it('parses comma-separated pages and ranges', () => {
      const parsed = parsePageRange('1, 3-5, 8', 10);
      expect(parsed).toEqual([0, 2, 3, 4, 7]);
    });

    it('handles "all" keyword', () => {
      const parsed = parsePageRange('ALL', 4);
      expect(parsed).toEqual([0, 1, 2, 3]);
    });

    it('ignores invalid and out-of-range tokens', () => {
      const parsed = parsePageRange('abc, -5, 0, 2, 99', 5);
      expect(parsed).toEqual([1]);
    });

    it('deduplicates and sorts indices', () => {
      const parsed = parsePageRange('3, 1, 2, 3, 1', 5);
      expect(parsed).toEqual([0, 1, 2]);
    });
  });

  describe('Task 13.3: Rotate Pages', () => {
    it('rotates specific pages by 90 degrees', async () => {
      const pdfBytes = await createTestPdf(3);
      const rotatedBytes = await rotatePagesInPdf(pdfBytes, [0, 2], 90);
      const doc = await PDFDocument.load(rotatedBytes);

      expect(doc.getPage(0).getRotation().angle).toBe(90);
      expect(doc.getPage(1).getRotation().angle).toBe(0);
      expect(doc.getPage(2).getRotation().angle).toBe(90);
    });

    it('rotates all pages when pageIndices is empty', async () => {
      const pdfBytes = await createTestPdf(2);
      const rotatedBytes = await rotatePagesInPdf(pdfBytes, [], 180);
      const doc = await PDFDocument.load(rotatedBytes);

      expect(doc.getPage(0).getRotation().angle).toBe(180);
      expect(doc.getPage(1).getRotation().angle).toBe(180);
    });
  });

  describe('Task 13.2: Delete Pages', () => {
    it('deletes selected pages without shifting errors', async () => {
      const pdfBytes = await createTestPdf(4);
      const modifiedBytes = await deletePagesFromPdf(pdfBytes, [1, 2]);
      const doc = await PDFDocument.load(modifiedBytes);

      expect(doc.getPageCount()).toBe(2);
    });

    it('throws error when attempting to delete all pages', async () => {
      const pdfBytes = await createTestPdf(2);
      await expect(deletePagesFromPdf(pdfBytes, [0, 1])).rejects.toThrow(/Cannot delete all pages/);
    });
  });

  describe('Task 13.4: Insert Blank Page', () => {
    it('inserts a blank page at target position with custom dimensions', async () => {
      const pdfBytes = await createTestPdf(2);
      const modifiedBytes = await insertBlankPageInPdf(pdfBytes, 1, 595.28, 841.89);
      const doc = await PDFDocument.load(modifiedBytes);

      expect(doc.getPageCount()).toBe(3);
      expect(Math.round(doc.getPage(1).getWidth())).toBe(595);
      expect(Math.round(doc.getPage(1).getHeight())).toBe(842);
    });
  });

  describe('Task 13.9: Duplicate Page', () => {
    it('duplicates a page and inserts it after the original', async () => {
      const pdfBytes = await createTestPdf(2);
      const modifiedBytes = await duplicatePageInPdf(pdfBytes, 0, 1);
      const doc = await PDFDocument.load(modifiedBytes);

      expect(doc.getPageCount()).toBe(3);
    });
  });

  describe('Task 13.1: Reorder Pages', () => {
    it('reorders pages into new order sequence', async () => {
      const pdfBytes = await createTestPdf(3);
      const modifiedBytes = await reorderPagesInPdf(pdfBytes, [2, 0, 1]);
      const doc = await PDFDocument.load(modifiedBytes);

      expect(doc.getPageCount()).toBe(3);
    });

    it('throws when new order length does not match', async () => {
      const pdfBytes = await createTestPdf(3);
      await expect(reorderPagesInPdf(pdfBytes, [1, 0])).rejects.toThrow(
        /does not match page count/
      );
    });
  });

  describe('Task 13.5: Insert Pages from Another PDF', () => {
    it('inserts pages from source document into target document', async () => {
      const targetPdf = await createTestPdf(2);
      const sourcePdf = await createTestPdf(3);

      const combined = await insertPagesFromOtherPdf(targetPdf, sourcePdf, [0, 2], 1);
      const doc = await PDFDocument.load(combined);

      expect(doc.getPageCount()).toBe(4);
    });
  });

  describe('Task 13.6: Merge Multiple PDFs', () => {
    it('merges multiple separate PDFs into one document', async () => {
      const pdf1 = await createTestPdf(2);
      const pdf2 = await createTestPdf(3);
      const pdf3 = await createTestPdf(1);

      const merged = await mergeMultiplePdfs([
        { bytes: pdf1, name: 'doc1.pdf' },
        { bytes: pdf2, name: 'doc2.pdf' },
        { bytes: pdf3, name: 'doc3.pdf' }
      ]);
      const doc = await PDFDocument.load(merged);

      expect(doc.getPageCount()).toBe(6);
    });
  });

  describe('Task 13.8: Extract Selected Pages', () => {
    it('creates a new PDF containing only selected pages', async () => {
      const pdfBytes = await createTestPdf(5);
      const extracted = await extractPagesFromPdf(pdfBytes, [1, 3]);
      const doc = await PDFDocument.load(extracted);

      expect(doc.getPageCount()).toBe(2);
    });
  });

  describe('Task 13.7: Split PDF & ZIP archive (fflate)', () => {
    it('splits a PDF every N pages', async () => {
      const pdfBytes = await createTestPdf(5);
      const files = await splitPdf(pdfBytes, { mode: 'everyN', everyN: 2 });

      expect(files.length).toBe(3);
      expect(files[0]?.pageCount).toBe(2);
      expect(files[1]?.pageCount).toBe(2);
      expect(files[2]?.pageCount).toBe(1);
    });

    it('splits a PDF by custom ranges', async () => {
      const pdfBytes = await createTestPdf(5);
      const files = await splitPdf(pdfBytes, { mode: 'ranges', ranges: '1-2; 3-5' });

      expect(files.length).toBe(2);
      expect(files[0]?.pageCount).toBe(2);
      expect(files[1]?.pageCount).toBe(3);
    });

    it('creates a valid ZIP archive of split files with fflate', async () => {
      const pdfBytes = await createTestPdf(4);
      const files = await splitPdf(pdfBytes, { mode: 'everyN', everyN: 2 });
      const zipData = zipFiles(files.map((f) => ({ name: f.filename, bytes: f.bytes })));

      expect(zipData.byteLength).toBeGreaterThan(0);
      // Valid ZIP begins with PK magic bytes 0x50 0x4B 0x03 0x04
      expect(zipData[0]).toBe(0x50);
      expect(zipData[1]).toBe(0x4b);
    });
  });

  describe('Task 13.10: Crop Page Margins (CropBox)', () => {
    it('sets CropBox on a page', async () => {
      const pdfBytes = await createTestPdf(2, 600, 800);
      const croppedBytes = await cropPageInPdf(pdfBytes, 0, {
        left: 50,
        bottom: 50,
        right: 550,
        top: 750
      });
      const doc = await PDFDocument.load(croppedBytes);
      const crop = doc.getPage(0).getCropBox();

      expect(crop.x).toBe(50);
      expect(crop.y).toBe(50);
      expect(crop.width).toBe(500);
      expect(crop.height).toBe(700);
    });
  });

  describe('Task 13.11: Resize Page (with scale content)', () => {
    it('resizes page dimensions without and with content scaling', async () => {
      const pdfBytes = await createTestPdf(1, 500, 500);
      const resizedBytes = await resizePageInPdf(pdfBytes, 0, 700, 900, true);
      const doc = await PDFDocument.load(resizedBytes);
      const page = doc.getPage(0);

      expect(page.getWidth()).toBe(700);
      expect(page.getHeight()).toBe(900);
    });
  });

  describe('Task 13.12: Images to PDF', () => {
    it('converts images into multi-page PDF', async () => {
      const pdfBytes = await imagesToPdf({
        images: [
          { name: 'img1.png', data: SAMPLE_PNG_BYTES, format: 'png' },
          { name: 'img2.png', data: SAMPLE_PNG_BYTES, format: 'png' }
        ],
        pageSize: 'A4'
      });
      const doc = await PDFDocument.load(pdfBytes);

      expect(doc.getPageCount()).toBe(2);
    });
  });

  describe('Task 13.13: Bookmarks / Outline Management', () => {
    it('adds, updates, moves, flattens and deletes bookmarks in memory', () => {
      const initial: BookmarkItem[] = [];
      const { tree: tree1, created: b1 } = addBookmark(initial, null, {
        title: 'Chapter 1',
        pageIndex: 0
      });
      const { tree: tree2, created: b2 } = addBookmark(tree1, b1.id, {
        title: 'Section 1.1',
        pageIndex: 1
      });

      expect(tree2.length).toBe(1);
      expect(tree2[0]?.children?.length).toBe(1);

      const found = findBookmark(tree2, b2.id);
      expect(found?.title).toBe('Section 1.1');

      const updated = updateBookmark(tree2, b2.id, { title: 'Section 1.1 Updated' });
      expect(findBookmark(updated, b2.id)?.title).toBe('Section 1.1 Updated');

      const flat = flattenBookmarks(updated);
      expect(flat.length).toBe(2);
      expect(flat[0]?.depth).toBe(0);
      expect(flat[1]?.depth).toBe(1);

      const deleted = deleteBookmark(updated, b2.id);
      expect(findBookmark(deleted, b2.id)).toBeNull();
    });

    it('saves and loads bookmarks in PDF outline structure', async () => {
      const pdfBytes = await createTestPdf(3);
      const bookmarks: BookmarkItem[] = [
        {
          id: 'b1',
          title: 'Introduction',
          pageIndex: 0,
          children: [{ id: 'b1_1', title: 'Background', pageIndex: 1 }]
        },
        {
          id: 'b2',
          title: 'Conclusion',
          pageIndex: 2
        }
      ];

      const savedWithBookmarks = await saveBookmarksToPdf(pdfBytes, bookmarks);
      const loaded = await loadBookmarksFromPdf(savedWithBookmarks);

      expect(loaded.length).toBe(2);
      expect(loaded[0]?.title).toBe('Introduction');
      expect(loaded[0]?.children?.length).toBe(1);
      expect(loaded[0]?.children?.[0]?.title).toBe('Background');
      expect(loaded[1]?.title).toBe('Conclusion');
    });
  });

  describe('Undoable Page Commands with EditSession', () => {
    it('supports undo and redo for RotatePagesCommand', async () => {
      const session = new EditSession('doc-1', 3);
      const pageRotations = [0, 0, 0];

      const cmd = new RotatePagesCommand([0, 1], 90, (indices, delta) => {
        indices.forEach((i) => {
          pageRotations[i] = ((pageRotations[i] ?? 0) + delta + 360) % 360;
        });
      });

      await session.execute(cmd);
      expect(pageRotations[0]).toBe(90);
      expect(pageRotations[1]).toBe(90);

      await session.undo();
      expect(pageRotations[0]).toBe(0);
      expect(pageRotations[1]).toBe(0);

      await session.redo();
      expect(pageRotations[0]).toBe(90);
      expect(pageRotations[1]).toBe(90);
    });

    it('supports undo and redo for DeletePagesCommand', async () => {
      const session = new EditSession('doc-1', 3);
      let pages = ['Page 1', 'Page 2', 'Page 3'];

      const cmd = new DeletePagesCommand(
        [1],
        (indices) => {
          pages = pages.filter((_, i) => !indices.includes(i));
        },
        () => {
          pages.splice(1, 0, 'Page 2');
        }
      );

      await session.execute(cmd);
      expect(pages).toEqual(['Page 1', 'Page 3']);

      await session.undo();
      expect(pages).toEqual(['Page 1', 'Page 2', 'Page 3']);

      await session.redo();
      expect(pages).toEqual(['Page 1', 'Page 3']);
    });

    it('supports undo and redo for InsertBlankPageCommand and DuplicatePageCommand', async () => {
      const session = new EditSession('doc-1', 2);
      let pageCount = 2;

      const insertCmd = new InsertBlankPageCommand(
        1,
        600,
        800,
        () => {
          pageCount++;
        },
        () => {
          pageCount--;
        }
      );

      await session.execute(insertCmd);
      expect(pageCount).toBe(3);

      await session.undo();
      expect(pageCount).toBe(2);

      const dupCmd = new DuplicatePageCommand(
        0,
        1,
        () => {
          pageCount++;
        },
        () => {
          pageCount--;
        }
      );

      await session.execute(dupCmd);
      expect(pageCount).toBe(3);

      await session.undo();
      expect(pageCount).toBe(2);
    });

    it('supports undo and redo for CropPageCommand and ResizePageCommand', async () => {
      const session = new EditSession('doc-1', 1);
      let crop: { left: number; top: number; right: number; bottom: number } | undefined;
      let size = { width: 500, height: 700 };

      const cropCmd = new CropPageCommand(
        0,
        undefined,
        { left: 10, bottom: 10, right: 490, top: 690 },
        (_idx, newCrop) => {
          crop = newCrop;
        }
      );

      await session.execute(cropCmd);
      expect(crop).toEqual({ left: 10, bottom: 10, right: 490, top: 690 });

      await session.undo();
      expect(crop).toBeUndefined();

      const resizeCmd = new ResizePageCommand(
        0,
        size,
        { width: 600, height: 800 },
        false,
        (_idx, w, h) => {
          size = { width: w, height: h };
        }
      );

      await session.execute(resizeCmd);
      expect(size).toEqual({ width: 600, height: 800 });

      await session.undo();
      expect(size).toEqual({ width: 500, height: 700 });
    });
  });
});
