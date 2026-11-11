import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  getSmartCopyFilename,
  exportPdfDocument,
  compressPdf,
  estimateExportSize,
  validateSavedPdf,
  preparePrintPdf
} from '../src/export';

async function createTestPdf(pageCount = 3): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([400, 600]);
    page.drawText(`Page ${i + 1} Content`, { x: 50, y: 500 });
  }
  return await doc.save();
}

describe('Phase 14: Save, Export, Share, Print operations', () => {
  describe('Task 14.2: getSmartCopyFilename', () => {
    it('appends -edited to standard pdf filename', () => {
      expect(getSmartCopyFilename('sample.pdf')).toBe('sample-edited.pdf');
      expect(getSmartCopyFilename('DOCUMENT.PDF')).toBe('DOCUMENT-edited.pdf');
    });

    it('increments index when -edited is already present', () => {
      expect(getSmartCopyFilename('sample-edited.pdf')).toBe('sample-edited-1.pdf');
      expect(getSmartCopyFilename('sample-edited-1.pdf')).toBe('sample-edited-2.pdf');
      expect(getSmartCopyFilename('sample-edited-9.pdf')).toBe('sample-edited-10.pdf');
    });

    it('handles filenames without extensions or with paths', () => {
      expect(getSmartCopyFilename('report')).toBe('report-edited.pdf');
      expect(getSmartCopyFilename('C:\\docs\\invoice.pdf')).toBe('invoice-edited.pdf');
      expect(getSmartCopyFilename('/home/user/notes.pdf')).toBe('notes-edited.pdf');
    });

    it('handles empty filename with default fallback', () => {
      expect(getSmartCopyFilename('')).toBe('document-edited.pdf');
      expect(getSmartCopyFilename('   ')).toBe('document-edited.pdf');
    });

    it('supports custom suffix', () => {
      expect(getSmartCopyFilename('doc.pdf', '_v2')).toBe('doc_v2.pdf');
    });
  });

  describe('Task 14.3: exportPdfDocument', () => {
    it('exports a valid PDF document with default options', async () => {
      const srcBytes = await createTestPdf(2);
      const exported = await exportPdfDocument(srcBytes, {});
      expect(exported.byteLength).toBeGreaterThan(0);

      const doc = await PDFDocument.load(exported);
      expect(doc.getPageCount()).toBe(2);
    });

    it('adjusts PDF version header when specified', async () => {
      const srcBytes = await createTestPdf(1);
      const exported = await exportPdfDocument(srcBytes, { pdfVersion: '1.4' });
      const header = String.fromCharCode(...exported.slice(0, 8));
      expect(header).toBe('%PDF-1.4');
    });

    it('flattens forms and annotations without throwing', async () => {
      const srcBytes = await createTestPdf(2);
      const exported = await exportPdfDocument(srcBytes, {
        flattenForms: true,
        flattenAnnotations: true,
        optimizeSize: true
      });
      expect(exported.byteLength).toBeGreaterThan(0);
      const doc = await PDFDocument.load(exported);
      expect(doc.getPageCount()).toBe(2);
    });
  });

  describe('Task 14.10: compressPdf & estimateExportSize', () => {
    it('compresses PDF and removes unreferenced data', async () => {
      const srcBytes = await createTestPdf(3);
      const result = await compressPdf(srcBytes, {
        removeMetadata: true,
        useObjectStreams: true
      });

      expect(result.originalSize).toBe(srcBytes.byteLength);
      expect(result.compressedSize).toBeGreaterThan(0);
      expect(typeof result.savingsRatio).toBe('number');
      expect(typeof result.savingsPercent).toBe('number');

      // Check the output is valid
      const doc = await PDFDocument.load(result.bytes);
      expect(doc.getPageCount()).toBe(3);
    });

    it('estimates export size based on options', () => {
      const initial = 1000000;
      const optimized = estimateExportSize(initial, { optimizeSize: true });
      expect(optimized).toBeLessThan(initial);

      const lowQuality = estimateExportSize(initial, { quality: 'low' });
      expect(lowQuality).toBe(600000);

      expect(estimateExportSize(0)).toBe(0);
    });
  });

  describe('Task 14.7: validateSavedPdf', () => {
    it('validates a correct PDF and returns page count', async () => {
      const bytes = await createTestPdf(4);
      const result = await validateSavedPdf(bytes, 4);

      expect(result.valid).toBe(true);
      expect(result.pageCount).toBe(4);
      expect(result.firstPageRenderable).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('detects page count mismatch and returns invalid', async () => {
      const bytes = await createTestPdf(3);
      const result = await validateSavedPdf(bytes, 5);

      expect(result.valid).toBe(false);
      expect(result.pageCount).toBe(3);
      expect(result.error).toContain('Page count mismatch');
    });

    it('rejects corrupt or too small bytes', async () => {
      const tinyBytes = new Uint8Array([1, 2, 3]);
      const result1 = await validateSavedPdf(tinyBytes);
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('too small');

      const badHeader = new TextEncoder().encode('NOT A VALID PDF FILE AT ALL IN ANY WAY 1234567890');
      const result2 = await validateSavedPdf(badHeader);
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('Invalid PDF header');
    });
  });

  describe('Task 14.5: preparePrintPdf', () => {
    it('returns all pages for print when pageRange is all', async () => {
      const srcBytes = await createTestPdf(3);
      const printBytes = await preparePrintPdf(srcBytes, { pageRange: 'all', copies: 1 });
      const doc = await PDFDocument.load(printBytes);
      expect(doc.getPageCount()).toBe(3);
    });

    it('filters pages based on custom range', async () => {
      const srcBytes = await createTestPdf(5);
      const printBytes = await preparePrintPdf(srcBytes, { pageRange: '1, 3', copies: 1 });
      const doc = await PDFDocument.load(printBytes);
      expect(doc.getPageCount()).toBe(2);
    });

    it('duplicates pages when copies > 1', async () => {
      const srcBytes = await createTestPdf(2);
      const printBytes = await preparePrintPdf(srcBytes, { pageRange: 'all', copies: 2 });
      const doc = await PDFDocument.load(printBytes);
      expect(doc.getPageCount()).toBe(4);
    });
  });
});
