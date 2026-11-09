import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { TextRun } from '@rhypdf/pdf-model';
import { PdfiumEngine, MockPdfEngine } from '../src/index';

describe('Task 2.7: Text-object details: string, font name, size, colors, render mode, rotation, and font info', () => {
  let engine: PdfiumEngine;
  let wasmBinary: ArrayBuffer;
  let singleColPdfBytes: Uint8Array;
  let twoColPdfBytes: Uint8Array;
  let subsetPdfBytes: Uint8Array;

  beforeAll(async () => {
    const wasmPath = path.resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = fs.readFileSync(wasmPath).buffer;

    const fixturesDir = path.resolve(__dirname, '../../test-fixtures/fixtures');
    singleColPdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '01_text_single_column.pdf'))
    );
    twoColPdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '02_two_column_article.pdf'))
    );
    subsetPdfBytes = new Uint8Array(fs.readFileSync(path.join(fixturesDir, '14_subset_font.pdf')));

    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('Single-column document text object details', () => {
    it('extracts text string, font name, size, fill color, and render mode on title object', async () => {
      const doc = await engine.open(singleColPdfBytes.buffer.slice(0));
      const objects = await engine.getPageObjects(doc, 0);

      const titleObj = objects[0] as TextRun;
      expect(titleObj.type).toBe('text');
      expect(titleObj.text).toContain('Sample Contract Agreement');
      expect(titleObj.fontName).toContain('Helvetica');
      expect(titleObj.fontSize).toBe(20);
      expect(titleObj.renderMode).toBe('fill');

      // Colors
      expect(titleObj.fillColor).toBeDefined();
      expect(titleObj.fillColor.r).toBeLessThan(50); // Dark text
      expect(titleObj.fillColor.g).toBeLessThan(50);
      expect(titleObj.fillColor.b).toBeLessThan(50);
      expect(titleObj.fillColor.a).toBe(255);

      // Transform & geometry
      expect(titleObj.rotation).toBe(0);
      expect(titleObj.horizontalScale).toBeCloseTo(1.0, 1);

      // Embedded font info
      expect(titleObj.fontInfo).toBeDefined();
      expect(typeof titleObj.fontInfo?.flags).toBe('number');
      expect(typeof titleObj.fontInfo?.weight).toBe('number');
      expect(typeof titleObj.fontInfo?.isEmbedded).toBe('boolean');

      await engine.close(doc);
    });

    it('extracts body text runs with distinct font sizes and coordinates', async () => {
      const doc = await engine.open(singleColPdfBytes.buffer.slice(0));
      const objects = await engine.getPageObjects(doc, 0);

      const textRuns = objects.filter((o): o is TextRun => o.type === 'text');
      expect(textRuns.length).toBe(5);

      // Section header (obj 1)
      expect(textRuns[1]!.fontSize).toBe(14);
      expect(textRuns[1]!.text).toContain('Scope of Agreement');

      // Paragraph lines (obj 2, 3, 4)
      expect(textRuns[2]!.fontSize).toBe(11);
      expect(textRuns[3]!.fontSize).toBe(11);
      expect(textRuns[4]!.fontSize).toBe(11);

      await engine.close(doc);
    });
  });

  describe('Two-column article text extraction and styling', () => {
    it('extracts multiple font families across two-column layout', async () => {
      const doc = await engine.open(twoColPdfBytes.buffer.slice(0));
      const objects = await engine.getPageObjects(doc, 0);

      const textRuns = objects.filter((o): o is TextRun => o.type === 'text');
      expect(textRuns.length).toBe(9);

      // Fonts used in fixture 2: Times-Bold, Times-Roman, Helvetica-Oblique
      const fontNames = textRuns.map((r) => r.fontName);
      expect(fontNames.some((f) => f.includes('Times'))).toBe(true);

      await engine.close(doc);
    });
  });

  describe('Embedded font info inspection', () => {
    it('queries font metadata, flags, and subset tags on 14_subset_font', async () => {
      const doc = await engine.open(subsetPdfBytes.buffer.slice(0));
      const objects = await engine.getPageObjects(doc, 0);

      const textObj = objects.find((o): o is TextRun => o.type === 'text');
      expect(textObj).toBeDefined();
      expect(textObj?.fontInfo).toBeDefined();
      expect(typeof textObj?.fontInfo?.flags).toBe('number');

      await engine.close(doc);
    });
  });

  describe('MockPdfEngine parity', () => {
    const mock = new MockPdfEngine();

    it('provides rich TextRun metadata on MockPdfEngine', async () => {
      const doc = await mock.open(singleColPdfBytes.buffer.slice(0));
      const objects = await mock.getPageObjects(doc, 0);

      const textRun = objects.find((o): o is TextRun => o.type === 'text');
      expect(textRun).toBeDefined();
      expect(textRun?.fontName).toBeDefined();
      expect(textRun?.fontSize).toBeGreaterThan(0);
      expect(textRun?.fillColor).toBeDefined();

      await mock.close(doc);
    });
  });
});
