import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfiumEngine, MockPdfEngine } from '../src/index';
import type { ImageObject } from '@rhypdf/pdf-model';

describe('Task 2.8: Image-object details', () => {
  let engine: PdfiumEngine;
  let wasmBinary: ArrayBuffer;
  let brochurePdfBytes: Uint8Array;

  beforeAll(async () => {
    const wasmPath = path.resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = fs.readFileSync(wasmPath).buffer;

    const fixturesDir = path.resolve(__dirname, '../../test-fixtures/fixtures');
    brochurePdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '03_image_brochure.pdf'))
    );

    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('Image extraction from 03_image_brochure.pdf', () => {
    it('extracts pixel dimensions, bounds, matrix, filters, color space, and preview bitmap', async () => {
      const doc = await engine.open(brochurePdfBytes.buffer.slice(0));
      const objects = await engine.getPageObjects(doc, 0);

      const images = objects.filter((o): o is ImageObject => o.type === 'image');
      expect(images.length).toBeGreaterThanOrEqual(1);

      for (const img of images) {
        expect(img.type).toBe('image');
        expect(img.id).toMatch(/^obj-0-\d+$/);

        // Pixel dimensions
        expect(img.pixelWidth).toBeGreaterThan(0);
        expect(img.pixelHeight).toBeGreaterThan(0);

        // Bounds in PDF points
        expect(img.bounds.left).toBeLessThan(img.bounds.right);
        expect(img.bounds.bottom).toBeLessThan(img.bounds.top);

        // Matrix
        expect(img.matrix.length).toBe(6);

        // Effective DPI
        expect(img.effectiveDpi.x).toBeGreaterThan(0);
        expect(img.effectiveDpi.y).toBeGreaterThan(0);

        // Color space and bits per pixel
        expect(['DeviceRGB', 'DeviceGray', 'DeviceCMYK', 'DeviceLab', 'Unknown']).toContain(
          img.colorSpace
        );
        expect(img.bitsPerPixel).toBeGreaterThanOrEqual(8);

        // Filters array
        expect(Array.isArray(img.filters)).toBe(true);

        // Mask flags
        expect(typeof img.hasMask).toBe('boolean');
        expect(typeof img.hasSoftMask).toBe('boolean');

        // Preview bitmap
        expect(img.previewBitmap).toBeDefined();
        if (img.previewBitmap) {
          expect(img.previewBitmap.width).toBe(img.pixelWidth);
          expect(img.previewBitmap.height).toBe(img.pixelHeight);
        }
      }

      await engine.close(doc);
    });
  });

  describe('MockPdfEngine parity', () => {
    const mock = new MockPdfEngine();

    it('returns consistent ImageObject models with metadata', async () => {
      const doc = await mock.open(brochurePdfBytes.buffer.slice(0));
      const objects = await mock.getPageObjects(doc, 0);
      const images = objects.filter((o): o is ImageObject => o.type === 'image');

      expect(images.length).toBeGreaterThan(0);
      const img = images[0]!;
      expect(img.pixelWidth).toBe(800);
      expect(img.pixelHeight).toBe(600);
      expect(img.effectiveDpi.x).toBe(288);
      expect(img.effectiveDpi.y).toBe(288);
      expect(img.colorSpace).toBe('DeviceRGB');
      expect(img.bitsPerPixel).toBe(24);
      expect(img.hasMask).toBe(false);
      expect(img.hasSoftMask).toBe(false);
      expect(img.filters).toEqual(['FlateDecode']);

      await mock.close(doc);
    });
  });
});
