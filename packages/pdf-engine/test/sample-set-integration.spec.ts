import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PdfiumEngine, isPdfError } from '../src/index';

const FIXTURES_DIR = resolve(__dirname, '../../test-fixtures/fixtures');

interface SampleConfig {
  id: number;
  filename: string;
  description: string;
  password?: string;
  isCorrupt?: boolean;
}

const SAMPLE_SET: SampleConfig[] = [
  { id: 1, filename: '01_text_single_column.pdf', description: 'Text-only single column' },
  { id: 2, filename: '02_two_column_article.pdf', description: 'Two-column article' },
  { id: 3, filename: '03_image_brochure.pdf', description: 'Image-heavy brochure' },
  { id: 4, filename: '04_scanned_clean.pdf', description: 'Clean scanned document' },
  { id: 5, filename: '05_scanned_skewed.pdf', description: 'Skewed scanned document' },
  {
    id: 6,
    filename: '06_encrypted.pdf',
    description: 'Password-protected document',
    password: 'secret123'
  },
  { id: 7, filename: '07_arabic_hebrew_rtl.pdf', description: 'RTL Arabic/Hebrew document' },
  { id: 8, filename: '08_cjk.pdf', description: 'CJK typography document' },
  { id: 9, filename: '09_acroform.pdf', description: 'Interactive AcroForm document' },
  { id: 10, filename: '10_large_multipage.pdf', description: 'Multi-page document' },
  { id: 11, filename: '11_rotated_cropbox.pdf', description: 'Rotated page with cropbox' },
  {
    id: 12,
    filename: '12_corrupt_truncated.pdf',
    description: 'Corrupted truncated file',
    isCorrupt: true
  },
  { id: 13, filename: '13_outlines_image_text.pdf', description: 'Outlines and vector paths' },
  { id: 14, filename: '14_subset_font.pdf', description: 'Subset-embedded fonts' }
];

describe('Task 2.15: Integration tests on 10-PDF sample set (Appendix A)', () => {
  let wasmBinary: ArrayBuffer;
  let engine: PdfiumEngine;

  beforeAll(async () => {
    const wasmPath = resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = readFileSync(wasmPath).buffer;
    engine = await PdfiumEngine.create({ wasmBinary });
  });

  for (const sample of SAMPLE_SET) {
    it(`Sample ${sample.id} (${sample.filename}): ${sample.description}`, async () => {
      const filePath = resolve(FIXTURES_DIR, sample.filename);
      expect(existsSync(filePath)).toBe(true);

      const fileBuf = readFileSync(filePath);
      const inputBuffer = fileBuf.buffer.slice(
        fileBuf.byteOffset,
        fileBuf.byteOffset + fileBuf.byteLength
      );

      // 1. Corrupt file verification
      if (sample.isCorrupt) {
        await expect(engine.open(inputBuffer)).rejects.toSatisfy((err: unknown) =>
          isPdfError(err, 'Corrupt')
        );
        return;
      }

      // 2. Open document with optional password
      const doc = await engine.open(inputBuffer, { password: sample.password });
      expect(typeof doc).toBe('string');

      const count = await engine.pageCount(doc);
      expect(count).toBeGreaterThan(0);

      // 3. Render all pages
      for (let p = 0; p < count; p++) {
        const info = await engine.pageInfo(doc, p);
        expect(info.width).toBeGreaterThan(0);
        expect(info.height).toBeGreaterThan(0);

        const bitmap = await engine.renderPage(doc, p, { scale: 0.5, dpr: 1 });
        expect(bitmap.width).toBeGreaterThan(0);
        expect(bitmap.height).toBeGreaterThan(0);
        bitmap.close();
      }

      // 4. Enumerate page objects on page 0
      const initialObjects = await engine.getPageObjects(doc, 0);
      expect(Array.isArray(initialObjects)).toBe(true);

      // 5. Apply a mutation: insert a unique text stamp
      const stampText = `P2.15-Verified-Sample-${sample.id}`;
      const mutationResult = await engine.mutate(doc, 0, [
        {
          type: 'insertText',
          text: stampText,
          fontSize: 14,
          matrix: [1, 0, 0, 1, 50, 50]
        }
      ]);
      expect(mutationResult.success).toBe(true);

      // 6. Save mutated document to new Blob (full rewrite)
      const savedBlob = await engine.save(doc, { incremental: false });
      expect(savedBlob).toBeInstanceOf(Blob);
      expect(savedBlob.size).toBeGreaterThan(0);

      // 7. Re-open saved Blob in engine to validate file structure integrity
      const savedDoc = await engine.open(savedBlob, { password: sample.password });
      expect(await engine.pageCount(savedDoc)).toBe(count);

      // 8. Re-validate: ensure stamp text is present in saved document's objects
      const savedObjects = await engine.getPageObjects(savedDoc, 0);
      const hasStamp = savedObjects.some(
        (o) => o.type === 'text' && (o as { text?: string }).text?.includes(stampText)
      );
      expect(hasStamp).toBe(true);

      // 9. Re-render saved document page 0
      const savedBitmap = await engine.renderPage(savedDoc, 0, { scale: 0.5, dpr: 1 });
      expect(savedBitmap.width).toBeGreaterThan(0);
      expect(savedBitmap.height).toBeGreaterThan(0);
      savedBitmap.close();

      // 10. Clean up documents and verify zero memory leaks
      await engine.close(doc);
      await engine.close(savedDoc);

      const leakReport = engine.checkLeaks();
      expect(leakReport.hasLeaks).toBe(false);
    });
  }
});
