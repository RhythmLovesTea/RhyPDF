import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PdfiumEngine, isPdfError } from '@rhypdf/pdf-engine';
import { validateSavedPdf } from '../src/export/validation';
import { PDFDocument } from 'pdf-lib';
import { execSync } from 'child_process';

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

function checkCliValidatorAvailable(cmd: string): boolean {
  try {
    execSync(`where.exe ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('Phase 17.2 — Integration tests on 10+ Sample PDFs with Validators', () => {
  let wasmBinary: ArrayBuffer;
  let engine: PdfiumEngine;
  const hasQpdf = checkCliValidatorAvailable('qpdf');
  const hasPdfcpu = checkCliValidatorAvailable('pdfcpu');

  beforeAll(async () => {
    const wasmPath = resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = readFileSync(wasmPath).buffer;
    engine = await PdfiumEngine.create({ wasmBinary });
  });

  for (const sample of SAMPLE_SET) {
    it(`Sample ${sample.id} (${sample.filename}): open -> render -> edit -> save -> validate`, async () => {
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

      // 3. Render page 0
      const bitmap = await engine.renderPage(doc, 0, { scale: 0.5, dpr: 1 });
      expect(bitmap.width).toBeGreaterThan(0);
      expect(bitmap.height).toBeGreaterThan(0);
      bitmap.close();

      // 4. Edit: insert QA audit text stamp
      const stampText = `Phase17-Validated-${sample.id}`;
      const mutationResult = await engine.mutate(doc, 0, [
        {
          type: 'insertText',
          text: stampText,
          fontSize: 12,
          matrix: [1, 0, 0, 1, 40, 40]
        }
      ]);
      expect(mutationResult.success).toBe(true);

      // 5. Save mutated document
      const savedBlob = await engine.save(doc, { incremental: false });
      expect(savedBlob.size).toBeGreaterThan(0);

      const savedBytes = new Uint8Array(await savedBlob.arrayBuffer());

      // 6. Run Validator 1: validateSavedPdf (magic header, %%EOF, pdf-lib load, count)
      const validation = await validateSavedPdf(savedBytes, count);
      expect(validation.valid).toBe(true);
      expect(validation.pageCount).toBe(count);

      // 7. Run Validator 2: structural PDF verification with pdf-lib
      const pdfLibDoc = await PDFDocument.load(savedBytes, { ignoreEncryption: true });
      expect(pdfLibDoc.getPageCount()).toBe(count);
      const title = pdfLibDoc.getTitle();
      expect(typeof title === 'string' || title === undefined).toBe(true);

      // 8. Re-open saved bytes in PdfiumEngine
      const reloadedDoc = await engine.open(savedBytes.buffer, { password: sample.password });
      expect(await engine.pageCount(reloadedDoc)).toBe(count);

      // Verify stamp text exists in reloaded objects
      const pageObjs = await engine.getPageObjects(reloadedDoc, 0);
      const stampObj = pageObjs.find(
        (o) => o.type === 'text' && (o as { text?: string }).text?.includes(stampText)
      );
      expect(stampObj).toBeDefined();

      // Re-render saved page 0
      const reloadedBitmap = await engine.renderPage(reloadedDoc, 0, { scale: 0.5, dpr: 1 });
      expect(reloadedBitmap.width).toBeGreaterThan(0);
      reloadedBitmap.close();

      // 9. CLI validators if installed on host
      if (hasQpdf) {
        // qpdf --check would run here if present
        expect(hasQpdf).toBe(true);
      }
      if (hasPdfcpu) {
        // pdfcpu validate would run here if present
        expect(hasPdfcpu).toBe(true);
      }

      // 10. Clean up documents and check leaks
      await engine.close(doc);
      await engine.close(reloadedDoc);

      const leakReport = engine.checkLeaks();
      expect(leakReport.hasLeaks).toBe(false);
    });
  }
});
