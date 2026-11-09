import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfiumEngine, MockPdfEngine, PdfError } from '../src/index';

describe('Task 2.5: Page render to ImageBitmap with scale, DPR, clipRect tiles, rotation & annotations', () => {
  let engine: PdfiumEngine;
  let wasmBinary: ArrayBuffer;
  let standardPdfBytes: Uint8Array;
  let rotatedPdfBytes: Uint8Array;
  let annotPdfBytes: Uint8Array;

  beforeAll(async () => {
    const wasmPath = path.resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = fs.readFileSync(wasmPath).buffer;

    const fixturesDir = path.resolve(__dirname, '../../test-fixtures/fixtures');
    standardPdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '01_text_single_column.pdf'))
    );
    rotatedPdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '11_rotated_cropbox.pdf'))
    );
    annotPdfBytes = new Uint8Array(fs.readFileSync(path.join(fixturesDir, '09_acroform.pdf')));

    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('Scale and Device Pixel Ratio (DPR)', () => {
    it('renders at 1x scale and 1x DPR', async () => {
      const doc = await engine.open(standardPdfBytes.buffer.slice(0));
      const info = await engine.pageInfo(doc, 0);

      const bitmap = await engine.renderPage(doc, 0, {
        scale: 1.0,
        dpr: 1.0
      });

      expect(bitmap).toBeDefined();
      expect(bitmap.width).toBe(Math.round(info.width));
      expect(bitmap.height).toBe(Math.round(info.height));

      await engine.close(doc);
    });

    it('renders at arbitrary high scale (2x) and DPR (1.5x) -> 3x effective factor', async () => {
      const doc = await engine.open(standardPdfBytes.buffer.slice(0));
      const info = await engine.pageInfo(doc, 0);

      const bitmap = await engine.renderPage(doc, 0, {
        scale: 2.0,
        dpr: 1.5
      });

      expect(bitmap.width).toBe(Math.round(info.width * 3.0));
      expect(bitmap.height).toBe(Math.round(info.height * 3.0));

      await engine.close(doc);
    });

    it('renders at fractional thumbnail scale (0.25x)', async () => {
      const doc = await engine.open(standardPdfBytes.buffer.slice(0));
      const info = await engine.pageInfo(doc, 0);

      const bitmap = await engine.renderPage(doc, 0, {
        scale: 0.25,
        dpr: 1.0
      });

      expect(bitmap.width).toBe(Math.round(info.width * 0.25));
      expect(bitmap.height).toBe(Math.round(info.height * 0.25));

      await engine.close(doc);
    });
  });

  describe('Tile-based rendering with clipRect', () => {
    it('renders a specific sub-region tile matching the clipRect bounds', async () => {
      const doc = await engine.open(standardPdfBytes.buffer.slice(0));

      // 150 pt wide x 200 pt tall tile
      const clipRect = {
        left: 50,
        bottom: 400,
        right: 200,
        top: 600
      };

      const bitmap = await engine.renderPage(doc, 0, {
        scale: 2.0,
        dpr: 1.0,
        clipRect
      });

      expect(bitmap.width).toBe(150 * 2);
      expect(bitmap.height).toBe(200 * 2);

      await engine.close(doc);
    });
  });

  describe('Rotation across all 4 angles (0, 90, 180, 270)', () => {
    it('renders correctly under rotationOverride 0, 90, 180, and 270 degrees', async () => {
      const doc = await engine.open(standardPdfBytes.buffer.slice(0));
      const info = await engine.pageInfo(doc, 0);

      // 0 degrees
      const bmp0 = await engine.renderPage(doc, 0, {
        scale: 1.0,
        dpr: 1.0,
        rotationOverride: 0
      });
      expect(bmp0.width).toBe(Math.round(info.width));
      expect(bmp0.height).toBe(Math.round(info.height));

      // 90 degrees: width and height swapped
      const bmp90 = await engine.renderPage(doc, 0, {
        scale: 1.0,
        dpr: 1.0,
        rotationOverride: 90
      });
      expect(bmp90.width).toBe(Math.round(info.height));
      expect(bmp90.height).toBe(Math.round(info.width));

      // 180 degrees: normal aspect ratio
      const bmp180 = await engine.renderPage(doc, 0, {
        scale: 1.0,
        dpr: 1.0,
        rotationOverride: 180
      });
      expect(bmp180.width).toBe(Math.round(info.width));
      expect(bmp180.height).toBe(Math.round(info.height));

      // 270 degrees: width and height swapped
      const bmp270 = await engine.renderPage(doc, 0, {
        scale: 1.0,
        dpr: 1.0,
        rotationOverride: 270
      });
      expect(bmp270.width).toBe(Math.round(info.height));
      expect(bmp270.height).toBe(Math.round(info.width));

      await engine.close(doc);
    });

    it('renders natively rotated PDF fixture (11_rotated_cropbox)', async () => {
      const doc = await engine.open(rotatedPdfBytes.buffer.slice(0));
      const info = await engine.pageInfo(doc, 0);
      expect(info.rotation).toBe(90);

      const bmp = await engine.renderPage(doc, 0, {
        scale: 1.0,
        dpr: 1.0
      });

      expect(bmp.width).toBe(Math.round(info.height));
      expect(bmp.height).toBe(Math.round(info.width));

      await engine.close(doc);
    });
  });

  describe('Annotations toggle', () => {
    it('supports rendering with annotations enabled and disabled', async () => {
      const doc = await engine.open(annotPdfBytes.buffer.slice(0));

      const bmpWithAnnot = await engine.renderPage(doc, 0, {
        scale: 1.0,
        dpr: 1.0,
        renderAnnotations: true
      });
      expect(bmpWithAnnot).toBeDefined();

      const bmpNoAnnot = await engine.renderPage(doc, 0, {
        scale: 1.0,
        dpr: 1.0,
        renderAnnotations: false
      });
      expect(bmpNoAnnot).toBeDefined();

      await engine.close(doc);
    });
  });

  describe('Cancellation support', () => {
    it('aborts render request when signal is already cancelled', async () => {
      const doc = await engine.open(standardPdfBytes.buffer.slice(0));
      const controller = new AbortController();
      controller.abort();

      await expect(
        engine.renderPage(doc, 0, { scale: 1.0, dpr: 1.0 }, controller.signal)
      ).rejects.toThrow(PdfError);
      await expect(
        engine.renderPage(doc, 0, { scale: 1.0, dpr: 1.0 }, controller.signal)
      ).rejects.toMatchObject({
        code: 'Cancelled'
      });

      await engine.close(doc);
    });
  });

  describe('MockPdfEngine parity', () => {
    const mock = new MockPdfEngine();

    it('handles scale, DPR, clipRect, and rotation in MockPdfEngine', async () => {
      const doc = await mock.open(standardPdfBytes.buffer.slice(0));

      const tileBmp = await mock.renderPage(doc, 0, {
        scale: 2.0,
        dpr: 1.0,
        clipRect: { left: 0, bottom: 0, right: 100, top: 100 }
      });
      expect(tileBmp.width).toBe(200);
      expect(tileBmp.height).toBe(200);

      const rotBmp = await mock.renderPage(doc, 0, {
        scale: 1.0,
        dpr: 1.0,
        rotationOverride: 90
      });
      expect(rotBmp.width).toBeCloseTo(841.89, 0);
      expect(rotBmp.height).toBeCloseTo(595.28, 0);

      await mock.close(doc);
    });
  });
});
