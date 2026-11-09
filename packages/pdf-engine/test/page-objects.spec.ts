import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfiumEngine, MockPdfEngine } from '../src/index';

describe('Task 2.6: Page-object enumeration returning PageObject models', () => {
  let engine: PdfiumEngine;
  let wasmBinary: ArrayBuffer;
  let singleColPdfBytes: Uint8Array;
  let brochurePdfBytes: Uint8Array;
  let outlinePdfBytes: Uint8Array;

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
    brochurePdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '03_image_brochure.pdf'))
    );
    outlinePdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '13_outlines_image_text.pdf'))
    );

    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('Single-column document enumeration', () => {
    it('enumerates all 5 text objects with bounds, matrix, and z-index', async () => {
      const doc = await engine.open(singleColPdfBytes.buffer.slice(0));
      const pageInfo = await engine.pageInfo(doc, 0);
      const objects = await engine.getPageObjects(doc, 0);

      expect(objects.length).toBe(5);

      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i]!;
        expect(obj.type).toBe('text');
        expect(obj.zIndex).toBe(i);
        expect(obj.id).toBe(`obj-0-${i}`);

        // Bounds validity in PDF points
        expect(obj.bounds.left).toBeLessThan(obj.bounds.right);
        expect(obj.bounds.bottom).toBeLessThan(obj.bounds.top);
        expect(obj.bounds.left).toBeGreaterThanOrEqual(0);
        expect(obj.bounds.right).toBeLessThanOrEqual(pageInfo.width + 10);
        expect(obj.bounds.bottom).toBeGreaterThanOrEqual(0);
        expect(obj.bounds.top).toBeLessThanOrEqual(pageInfo.height + 10);

        // Matrix validity
        expect(obj.matrix.length).toBe(6);
        expect(Number.isFinite(obj.matrix[0])).toBe(true);
        expect(Number.isFinite(obj.matrix[4])).toBe(true); // translation X
        expect(Number.isFinite(obj.matrix[5])).toBe(true); // translation Y
      }

      await engine.close(doc);
    });
  });

  describe('Multi-type document enumeration (text + images)', () => {
    it('detects text and image objects with correct dimensions in 03_image_brochure', async () => {
      const doc = await engine.open(brochurePdfBytes.buffer.slice(0));
      const objects = await engine.getPageObjects(doc, 0);

      expect(objects.length).toBe(3);

      const textObj = objects.find((o) => o.type === 'text');
      expect(textObj).toBeDefined();

      const imageObjs = objects.filter((o) => o.type === 'image');
      expect(imageObjs.length).toBe(2);

      for (const img of imageObjs) {
        expect(img.pixelWidth).toBeGreaterThan(0);
        expect(img.pixelHeight).toBeGreaterThan(0);
        expect(img.bounds.left).toBeLessThan(img.bounds.right);
        expect(img.bounds.bottom).toBeLessThan(img.bounds.top);
      }

      await engine.close(doc);
    });
  });

  describe('Vector path object enumeration', () => {
    it('detects path objects in vector document', async () => {
      const doc = await engine.open(outlinePdfBytes.buffer.slice(0));
      const objects = await engine.getPageObjects(doc, 0);

      expect(objects.length).toBeGreaterThan(0);
      const pathObj = objects.find((o) => o.type === 'path');
      expect(pathObj).toBeDefined();
      expect(pathObj?.bounds).toBeDefined();

      await engine.close(doc);
    });
  });

  describe('MockPdfEngine parity', () => {
    const mock = new MockPdfEngine();

    it('returns consistent PageObject models from MockPdfEngine', async () => {
      const doc = await mock.open(singleColPdfBytes.buffer.slice(0));
      const objects = await mock.getPageObjects(doc, 0);

      expect(objects.length).toBeGreaterThan(0);
      for (const obj of objects) {
        expect(obj.id).toBeDefined();
        expect(obj.bounds).toBeDefined();
        expect(obj.matrix).toBeDefined();
        expect(typeof obj.zIndex).toBe('number');
      }

      await mock.close(doc);
    });
  });
});
