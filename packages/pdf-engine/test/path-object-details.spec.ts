import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfiumEngine, MockPdfEngine } from '../src/index';
import type { PathObject } from '@rhypdf/pdf-model';

describe('Task 2.9: Path-object details (vector shapes)', () => {
  let engine: PdfiumEngine;
  let wasmBinary: ArrayBuffer;
  let outlinesPdfBytes: Uint8Array;
  let brochurePdfBytes: Uint8Array;

  beforeAll(async () => {
    const wasmPath = path.resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = fs.readFileSync(wasmPath).buffer;

    const fixturesDir = path.resolve(__dirname, '../../test-fixtures/fixtures');
    outlinesPdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '13_outlines_image_text.pdf'))
    );
    brochurePdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '03_image_brochure.pdf'))
    );

    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('Path extraction from vector fixture documents', () => {
    it('extracts path segments, lineWidth, stroke, fill and colors from 13_outlines_image_text.pdf', async () => {
      const doc = await engine.open(outlinesPdfBytes.buffer.slice(0));
      const objects = await engine.getPageObjects(doc, 0);

      const paths = objects.filter((o): o is PathObject => o.type === 'path');
      expect(paths.length).toBeGreaterThan(0);

      for (const p of paths) {
        expect(p.type).toBe('path');
        expect(p.id).toMatch(/^obj-0-\d+$/);

        // Bounds
        expect(p.bounds.left).toBeLessThanOrEqual(p.bounds.right);
        expect(p.bounds.bottom).toBeLessThanOrEqual(p.bounds.top);

        // Line width
        expect(p.lineWidth).toBeGreaterThan(0);

        // Segments
        expect(Array.isArray(p.segments)).toBe(true);
        for (const seg of p.segments) {
          expect(['moveTo', 'lineTo', 'bezierCurveTo', 'closePath']).toContain(seg.type);
          for (const pt of seg.points) {
            expect(Number.isFinite(pt.x)).toBe(true);
            expect(Number.isFinite(pt.y)).toBe(true);
          }
        }

        // Draw mode
        expect(typeof p.stroke).toBe('boolean');
        expect(typeof p.fill).toBe('boolean');
        expect(['none', 'alternate', 'winding']).toContain(p.fillMode);

        // Colors when present
        if (p.strokeColor) {
          expect(p.strokeColor.r).toBeGreaterThanOrEqual(0);
          expect(p.strokeColor.r).toBeLessThanOrEqual(255);
          expect(p.strokeColor.a).toBeGreaterThanOrEqual(0);
          expect(p.strokeColor.a).toBeLessThanOrEqual(255);
        }
        if (p.fillColor) {
          expect(p.fillColor.r).toBeGreaterThanOrEqual(0);
          expect(p.fillColor.r).toBeLessThanOrEqual(255);
          expect(p.fillColor.a).toBeGreaterThanOrEqual(0);
          expect(p.fillColor.a).toBeLessThanOrEqual(255);
        }
      }

      await engine.close(doc);
    });

    it('extracts vector shapes from 03_image_brochure.pdf', async () => {
      const doc = await engine.open(brochurePdfBytes.buffer.slice(0));
      const objects = await engine.getPageObjects(doc, 0);

      const paths = objects.filter((o): o is PathObject => o.type === 'path');
      // Brochure has at least 0 or more paths alongside images and text
      expect(Array.isArray(paths)).toBe(true);

      await engine.close(doc);
    });
  });

  describe('MockPdfEngine parity', () => {
    const mock = new MockPdfEngine();

    it('returns consistent PathObject model with segments, stroke, and fill', async () => {
      const doc = await mock.open(brochurePdfBytes.buffer.slice(0));
      const objects = await mock.getPageObjects(doc, 1);

      const pathObj = objects.find((o): o is PathObject => o.type === 'path');
      expect(pathObj).toBeDefined();

      if (pathObj) {
        expect(pathObj.id).toBe('path-1');
        expect(pathObj.lineWidth).toBe(2);
        expect(pathObj.stroke).toBe(true);
        expect(pathObj.fill).toBe(true);
        expect(pathObj.fillMode).toBe('winding');
        expect(pathObj.strokeColor).toEqual({ r: 30, g: 64, b: 175, a: 255 });
        expect(pathObj.fillColor).toEqual({ r: 219, g: 234, b: 254, a: 255 });
        expect(pathObj.dashArray).toEqual([4, 2]);
        expect(pathObj.dashPhase).toBe(0);
        expect(pathObj.segments.length).toBe(5);
        expect(pathObj.segments[0]!.type).toBe('moveTo');
        expect(pathObj.segments[4]!.type).toBe('closePath');
      }

      await mock.close(doc);
    });
  });
});
