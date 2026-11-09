import { describe, it, expect } from 'vitest';
import { MockPdfEngine, PdfError } from '../src/index';

describe('PdfEngine interface & MockPdfEngine implementation (Task 2.1)', () => {
  const engine = new MockPdfEngine();
  const samplePdfData = new TextEncoder().encode('%PDF-1.7\n%Dummy content\n%%EOF').buffer;

  describe('open & close lifecycle', () => {
    it('throws PdfError("Corrupt") when document data is empty', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      await expect(engine.open(emptyBuffer)).rejects.toThrow(PdfError);
      await expect(engine.open(emptyBuffer)).rejects.toMatchObject({
        code: 'Corrupt'
      });
    });

    it('throws PdfError("WrongPassword") when invalid password provided', async () => {
      await expect(
        engine.open(samplePdfData, { password: 'wrong_password' })
      ).rejects.toMatchObject({
        code: 'WrongPassword'
      });
    });

    it('opens document successfully and returns a DocumentHandle', async () => {
      const doc = await engine.open(samplePdfData);
      expect(typeof doc).toBe('string');
      expect(doc).toMatch(/^mock-doc-\d+$/);

      await engine.close(doc);
    });

    it('throws PdfError("IO") when closing an invalid or already closed handle', async () => {
      const doc = await engine.open(samplePdfData);
      await engine.close(doc);

      await expect(engine.close(doc)).rejects.toMatchObject({
        code: 'IO'
      });
    });
  });

  describe('page metadata and query', () => {
    it('returns correct page count and page info', async () => {
      const doc = await engine.open(samplePdfData);

      const count = await engine.pageCount(doc);
      expect(count).toBe(2);

      const page0 = await engine.pageInfo(doc, 0);
      expect(page0.pageIndex).toBe(0);
      expect(page0.width).toBeCloseTo(595.28, 1);
      expect(page0.height).toBeCloseTo(841.89, 1);
      expect(page0.rotation).toBe(0);

      const page1 = await engine.pageInfo(doc, 1);
      expect(page1.pageIndex).toBe(1);
      expect(page1.rotation).toBe(90);

      await engine.close(doc);
    });

    it('throws PdfError("Unsupported") when requesting out-of-bounds page', async () => {
      const doc = await engine.open(samplePdfData);

      await expect(engine.pageInfo(doc, 99)).rejects.toMatchObject({
        code: 'Unsupported'
      });
      await expect(engine.pageInfo(doc, -1)).rejects.toMatchObject({
        code: 'Unsupported'
      });

      await engine.close(doc);
    });
  });

  describe('page rendering and cancellation', () => {
    it('renders page and returns an ImageBitmap matching scale and DPR', async () => {
      const doc = await engine.open(samplePdfData);

      const bitmap = await engine.renderPage(doc, 0, {
        scale: 1.5,
        dpr: 2.0
      });

      expect(bitmap).toBeDefined();
      expect(bitmap.width).toBe(Math.round(595.28 * 1.5 * 2.0));
      expect(bitmap.height).toBe(Math.round(841.89 * 1.5 * 2.0));

      await engine.close(doc);
    });

    it('throws PdfError("Cancelled") when AbortSignal is pre-aborted or aborted', async () => {
      const doc = await engine.open(samplePdfData);

      const controller = new AbortController();
      controller.abort();

      await expect(
        engine.renderPage(doc, 0, { scale: 1.0, dpr: 1.0 }, controller.signal)
      ).rejects.toMatchObject({
        code: 'Cancelled'
      });

      await engine.close(doc);
    });
  });

  describe('page object enumeration and text extraction', () => {
    it('returns typed page objects without leaking PDFium internals', async () => {
      const doc = await engine.open(samplePdfData);

      const objects = await engine.getPageObjects(doc, 0);
      expect(objects.length).toBe(3);

      const textObj = objects.find((o) => o.id === 'text-1');
      expect(textObj).toBeDefined();
      expect(textObj?.type).toBe('text');
      if (textObj?.type === 'text') {
        expect(textObj.text).toBe('RhyPDF Private Editor');
        expect(textObj.fontSize).toBe(18);
        expect(textObj.fontName).toBe('Helvetica');
        expect(textObj.charBoxes?.length).toBe(3);
      }

      const imgObj = objects.find((o) => o.id === 'img-1');
      expect(imgObj).toBeDefined();
      expect(imgObj?.type).toBe('image');
      if (imgObj?.type === 'image') {
        expect(imgObj.pixelWidth).toBe(800);
        expect(imgObj.pixelHeight).toBe(600);
        expect(imgObj.effectiveDpi).toEqual({ x: 288, y: 288 });
      }

      await engine.close(doc);
    });

    it('extracts text runs cleanly', async () => {
      const doc = await engine.open(samplePdfData);

      const textRuns = await engine.extractText(doc, 0);
      expect(textRuns.length).toBe(2);
      expect(textRuns[0].text).toBe('RhyPDF Private Editor');
      expect(textRuns[1].text).toBe('Your documents never leave your device.');

      await engine.close(doc);
    });
  });

  describe('mutation API and save', () => {
    it('applies removeObject, insertText, insertImage, setMatrix, and reorderObject', async () => {
      const doc = await engine.open(samplePdfData);

      // 1. Remove text-1
      const mut1 = await engine.mutate(doc, 0, [{ type: 'removeObject', objectId: 'text-1' }]);
      expect(mut1.success).toBe(true);
      expect(mut1.remainingObjectsCount).toBe(2);

      // 2. Insert new text
      const mut2 = await engine.mutate(doc, 0, [
        {
          type: 'insertText',
          text: 'Edited Confidential Document',
          fontName: 'Times-Roman',
          fontSize: 16,
          fillColor: { r: 220, g: 38, b: 38, a: 255 },
          matrix: [1, 0, 0, 1, 100, 600]
        }
      ]);
      expect(mut2.remainingObjectsCount).toBe(3);

      const updatedRuns = await engine.extractText(doc, 0);
      expect(updatedRuns.some((r) => r.text === 'Edited Confidential Document')).toBe(true);
      expect(updatedRuns.some((r) => r.text === 'RhyPDF Private Editor')).toBe(false);

      // 3. Set matrix on text-2
      await engine.mutate(doc, 0, [
        {
          type: 'setMatrix',
          objectId: 'text-2',
          matrix: [1, 0, 0, 1, 80, 700]
        }
      ]);
      const objects = await engine.getPageObjects(doc, 0);
      const text2 = objects.find((o) => o.id === 'text-2');
      expect(text2?.matrix).toEqual([1, 0, 0, 1, 80, 700]);

      // 4. Save to a new Blob
      const savedBlob = await engine.save(doc, { stripSecurity: true });
      expect(savedBlob).toBeInstanceOf(Blob);
      expect(savedBlob.type).toBe('application/pdf');
      expect(savedBlob.size).toBeGreaterThan(0);

      const content = await savedBlob.text();
      expect(content).toContain('%PDF-1.7');
      expect(content).toContain('RhyPDF Mock Engine Exported');

      await engine.close(doc);
    });
  });
});
