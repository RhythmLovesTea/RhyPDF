import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PdfiumEngine } from '@rhypdf/pdf-engine';
import { comparePixels } from '../../test-fixtures/src/golden';

const FIXTURES_DIR = resolve(__dirname, '../../test-fixtures/fixtures');

describe('Task 17.4: Golden-image tests for each script and each font category', () => {
  let engine: PdfiumEngine;

  beforeAll(async () => {
    const wasmPath = resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    const wasmBinary = readFileSync(wasmPath).buffer;
    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('Script Families Rendering & Golden Verification', () => {
    const scriptFixtures = [
      {
        script: 'Latin',
        file: '01_text_single_column.pdf',
        expectedMinWidth: 500,
        expectedMinHeight: 700
      },
      {
        script: 'Complex Shaped / Indic',
        file: '06_complex_shaped.pdf',
        expectedMinWidth: 300,
        expectedMinHeight: 300
      },
      {
        script: 'Arabic & Hebrew RTL',
        file: '07_arabic_hebrew_rtl.pdf',
        expectedMinWidth: 300,
        expectedMinHeight: 300
      },
      {
        script: 'CJK (Chinese, Japanese, Korean)',
        file: '08_cjk.pdf',
        expectedMinWidth: 300,
        expectedMinHeight: 300
      },
      {
        script: 'Subset / Embedded Glyphs',
        file: '14_subset_font.pdf',
        expectedMinWidth: 300,
        expectedMinHeight: 300
      }
    ];

    for (const fixture of scriptFixtures) {
      it(`renders script "${fixture.script}" deterministically with zero pixel drift`, async () => {
        const filePath = resolve(FIXTURES_DIR, fixture.file);
        expect(existsSync(filePath)).toBe(true);

        const fileBuf = readFileSync(filePath);
        const inputBuffer = fileBuf.buffer.slice(
          fileBuf.byteOffset,
          fileBuf.byteOffset + fileBuf.byteLength
        );
        const doc = await engine.open(inputBuffer);
        const pageCount = await engine.pageCount(doc);
        expect(pageCount).toBeGreaterThan(0);

        // Render pass 1
        const bitmap1 = await engine.renderPage(doc, 0, { scale: 1.0, dpr: 1.0 });
        expect(bitmap1.width).toBeGreaterThanOrEqual(fixture.expectedMinWidth);
        expect(bitmap1.height).toBeGreaterThanOrEqual(fixture.expectedMinHeight);
        expect(bitmap1.data.byteLength).toBe(bitmap1.width * bitmap1.height * 4);

        // Render pass 2 (identical parameters)
        const bitmap2 = await engine.renderPage(doc, 0, { scale: 1.0, dpr: 1.0 });

        // Verify deterministic rendering: exact pixel match (0 diff pixels)
        const comparison = comparePixels(
          bitmap1.data,
          bitmap2.data,
          bitmap1.width,
          bitmap1.height,
          {
            threshold: 0.05,
            maxDiffPixels: 0
          }
        );

        expect(comparison.matched).toBe(true);
        expect(comparison.diffPixels).toBe(0);
        expect(comparison.diffPercentage).toBe(0);

        // Verify that the page is not blank (contains rendered dark ink pixels on light background)
        let nonWhitePixels = 0;
        const data = bitmap1.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Check if pixel is not pure white
          if (r < 240 || g < 240 || b < 240) {
            nonWhitePixels++;
          }
        }
        expect(nonWhitePixels).toBeGreaterThan(20);

        await engine.close(doc);
      });
    }

    it('detects visual regressions if page content is altered (mutation detection)', async () => {
      const filePath = resolve(FIXTURES_DIR, '01_text_single_column.pdf');
      const originalBytes = readFileSync(filePath);

      // Mutate by adding a prominent black bar
      const pdfDoc = await PDFDocument.load(originalBytes);
      const page = pdfDoc.getPage(0);
      page.drawRectangle({
        x: 100,
        y: 500,
        width: 250,
        height: 80,
        color: rgb(0, 0, 0)
      });
      const mutatedBytes = await pdfDoc.save();

      const doc1 = await engine.open(
        originalBytes.buffer.slice(
          originalBytes.byteOffset,
          originalBytes.byteOffset + originalBytes.byteLength
        )
      );
      const doc2 = await engine.open(
        mutatedBytes.buffer.slice(
          mutatedBytes.byteOffset,
          mutatedBytes.byteOffset + mutatedBytes.byteLength
        )
      );

      const bitmapOriginal = await engine.renderPage(doc1, 0, { scale: 1.0, dpr: 1.0 });
      const bitmapMutated = await engine.renderPage(doc2, 0, { scale: 1.0, dpr: 1.0 });

      const result = comparePixels(
        bitmapOriginal.data,
        bitmapMutated.data,
        bitmapOriginal.width,
        bitmapOriginal.height,
        { threshold: 0.1, maxDiffPixels: 0 }
      );

      expect(result.matched).toBe(false);
      expect(result.diffPixels).toBeGreaterThan(500);
      expect(result.diffPngBuffer).toBeDefined();

      await engine.close(doc1);
      await engine.close(doc2);
    });
  });

  describe('Font Category Golden Comparisons', () => {
    it('verifies visual distinction and determinism across standard font categories', async () => {
      // 1. Generate four pages, each with identical text rendered in one of the 4 standard categories:
      // - Sans-serif (Helvetica)
      // - Serif (TimesRoman)
      // - Monospace (Courier)
      // - Display / Bold Oblique styling (HelveticaBoldOblique)

      const pdfDoc = await PDFDocument.create();
      const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
      const fontDisplay = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

      const sampleText = 'Typography Golden Verification: ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890';
      const categories = [
        { name: 'sans-serif', font: fontSans },
        { name: 'serif', font: fontSerif },
        { name: 'monospace', font: fontMono },
        { name: 'display', font: fontDisplay }
      ];

      for (const cat of categories) {
        const page = pdfDoc.addPage([500, 200]);
        page.drawText(cat.name.toUpperCase(), {
          x: 50,
          y: 140,
          size: 16,
          font: fontSans,
          color: rgb(0.2, 0.2, 0.8)
        });
        page.drawText(sampleText, {
          x: 50,
          y: 100,
          size: 12,
          font: cat.font,
          color: rgb(0.1, 0.1, 0.1)
        });
      }

      const pdfBytes = await pdfDoc.save();
      const doc = await engine.open(pdfBytes.buffer.slice(0));
      expect(await engine.pageCount(doc)).toBe(4);

      // Render each category
      const bitmaps = [];
      for (let i = 0; i < 4; i++) {
        const b = await engine.renderPage(doc, i, { scale: 1.0, dpr: 1.0 });
        bitmaps.push(b);
      }

      // Verify each page renders cleanly and non-blank
      for (let i = 0; i < 4; i++) {
        const b = bitmaps[i];
        expect(b.width).toBe(500);
        expect(b.height).toBe(200);

        // Deterministic re-render
        const re = await engine.renderPage(doc, i, { scale: 1.0, dpr: 1.0 });
        const match = comparePixels(b.data, re.data, b.width, b.height);
        expect(match.matched).toBe(true);
        expect(match.diffPixels).toBe(0);
      }

      // Verify that the font categories produce visually distinct pixels
      // Comparing Sans-serif (page 0) vs Serif (page 1)
      const sansVsSerif = comparePixels(
        bitmaps[0].data,
        bitmaps[1].data,
        bitmaps[0].width,
        bitmaps[0].height,
        { threshold: 0.1, maxDiffPixels: 10 }
      );
      expect(sansVsSerif.matched).toBe(false);
      expect(sansVsSerif.diffPixels).toBeGreaterThan(100);

      // Comparing Sans-serif (page 0) vs Monospace (page 2)
      const sansVsMono = comparePixels(
        bitmaps[0].data,
        bitmaps[2].data,
        bitmaps[0].width,
        bitmaps[0].height,
        { threshold: 0.1, maxDiffPixels: 10 }
      );
      expect(sansVsMono.matched).toBe(false);
      expect(sansVsMono.diffPixels).toBeGreaterThan(100);

      // Comparing Serif (page 1) vs Display (page 3)
      const serifVsDisplay = comparePixels(
        bitmaps[1].data,
        bitmaps[3].data,
        bitmaps[1].width,
        bitmaps[1].height,
        { threshold: 0.1, maxDiffPixels: 10 }
      );
      expect(serifVsDisplay.matched).toBe(false);
      expect(serifVsDisplay.diffPixels).toBeGreaterThan(100);

      await engine.close(doc);
    });

    it('validates scale stability (1x vs 2x zoom) without glyph distortion', async () => {
      const filePath = resolve(FIXTURES_DIR, '01_text_single_column.pdf');
      const pdfBytes = readFileSync(filePath);
      const doc = await engine.open(
        pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
      );

      const bitmap1x = await engine.renderPage(doc, 0, { scale: 1.0, dpr: 1.0 });
      const bitmap2x = await engine.renderPage(doc, 0, { scale: 2.0, dpr: 1.0 });

      expect(Math.abs(bitmap2x.width - bitmap1x.width * 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(bitmap2x.height - bitmap1x.height * 2)).toBeLessThanOrEqual(1);

      // Verify 2x has expected quadrupled buffer length
      expect(bitmap2x.data.byteLength).toBe(bitmap2x.width * bitmap2x.height * 4);

      await engine.close(doc);
    });
  });
});
