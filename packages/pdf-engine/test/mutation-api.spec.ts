import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfiumEngine, MockPdfEngine } from '../src/index';
import type { TextRun, ImageObject, PathObject } from '@rhypdf/pdf-model';

describe('Task 2.11: Mutation API', () => {
  let engine: PdfiumEngine;
  let wasmBinary: ArrayBuffer;
  let singleColPdfBytes: Uint8Array;

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

    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('PdfiumEngine mutations', () => {
    it('applies removeObject, insertTextObject, insertImageObject, insertPathObject, setMatrix, setColor, reorderObject, setTextRenderMode', async () => {
      const doc = await engine.open(singleColPdfBytes.buffer.slice(0));
      const initialObjects = await engine.getPageObjects(doc, 0);
      expect(initialObjects.length).toBe(5);

      // 1. removeObject
      const firstObj = initialObjects[0]! as TextRun;
      const firstId = firstObj.id;
      const remResult = await engine.mutate(doc, 0, [{ type: 'removeObject', objectId: firstId }]);
      expect(remResult.success).toBe(true);
      expect(remResult.remainingObjectsCount).toBe(4);

      const objectsAfterRem = await engine.getPageObjects(doc, 0);
      expect(objectsAfterRem.length).toBe(4);
      expect(
        objectsAfterRem.some(
          (o) => o.type === 'text' && (o as TextRun).text.includes('Sample Contract Agreement')
        )
      ).toBe(false);

      // 2. insertTextObject
      const textResult = await engine.mutate(doc, 0, [
        {
          type: 'insertTextObject',
          text: 'Newly Inserted Title',
          fontName: 'Helvetica',
          fontSize: 22,
          fillColor: { r: 220, g: 38, b: 38, a: 255 },
          strokeColor: { r: 0, g: 0, b: 0, a: 255 },
          matrix: [1, 0, 0, 1, 72, 800],
          renderMode: 'fillThenStroke'
        }
      ]);
      expect(textResult.success).toBe(true);
      expect(textResult.remainingObjectsCount).toBe(5);

      let objects = await engine.getPageObjects(doc, 0);
      const insertedText = objects.find(
        (o): o is TextRun => o.type === 'text' && o.text.includes('Newly Inserted Title')
      );
      expect(insertedText).toBeDefined();
      expect(insertedText?.fontSize).toBe(22);
      expect(insertedText?.fillColor.r).toBe(220);
      expect(insertedText?.renderMode).toBe('fillThenStroke');

      // 3. insertImageObject (tiny 2x2 RGBA image)
      const rawRgba = new Uint8Array([
        255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255
      ]);
      const imgResult = await engine.mutate(doc, 0, [
        {
          type: 'insertImageObject',
          imageData: rawRgba,
          width: 2,
          height: 2,
          matrix: [100, 0, 0, 100, 72, 500]
        }
      ]);
      expect(imgResult.success).toBe(true);

      objects = await engine.getPageObjects(doc, 0);
      const insertedImg = objects.find((o): o is ImageObject => o.type === 'image');
      expect(insertedImg).toBeDefined();
      expect(insertedImg?.pixelWidth).toBe(2);
      expect(insertedImg?.pixelHeight).toBe(2);

      // 4. insertPathObject (vector rectangle)
      const pathResult = await engine.mutate(doc, 0, [
        {
          type: 'insertPathObject',
          segments: [
            { type: 'moveTo', points: [{ x: 72, y: 300 }] },
            { type: 'lineTo', points: [{ x: 272, y: 300 }] },
            { type: 'lineTo', points: [{ x: 272, y: 350 }] },
            { type: 'lineTo', points: [{ x: 72, y: 350 }] },
            { type: 'closePath', points: [] }
          ],
          lineWidth: 3,
          strokeColor: { r: 37, g: 99, b: 235, a: 255 },
          fillColor: { r: 191, g: 219, b: 254, a: 255 },
          fillMode: 'winding',
          stroke: true,
          fill: true
        }
      ]);
      expect(pathResult.success).toBe(true);

      objects = await engine.getPageObjects(doc, 0);
      const insertedPath = objects.find((o): o is PathObject => o.type === 'path');
      expect(insertedPath).toBeDefined();
      expect(insertedPath?.lineWidth).toBe(3);
      expect(insertedPath?.segments.length).toBeGreaterThanOrEqual(4);

      // 5. setMatrix on inserted text
      const textId = insertedText!.id;
      const matResult = await engine.mutate(doc, 0, [
        {
          type: 'setMatrix',
          objectId: textId,
          matrix: [1, 0, 0, 1, 150, 750]
        }
      ]);
      expect(matResult.success).toBe(true);

      objects = await engine.getPageObjects(doc, 0);
      const updatedText = objects.find((o) => o.id === textId);
      expect(updatedText?.matrix[4]).toBe(150);
      expect(updatedText?.matrix[5]).toBe(750);

      // 6. setColor
      await engine.mutate(doc, 0, [
        {
          type: 'setColor',
          objectId: textId,
          fillColor: { r: 16, g: 185, b: 129, a: 255 }
        }
      ]);

      objects = await engine.getPageObjects(doc, 0);
      const greenText = objects.find((o): o is TextRun => o.id === textId);
      expect(greenText?.fillColor.g).toBe(185);

      // 7. setTextRenderMode
      await engine.mutate(doc, 0, [
        {
          type: 'setTextRenderMode',
          objectId: textId,
          renderMode: 'stroke'
        }
      ]);

      objects = await engine.getPageObjects(doc, 0);
      const strokedText = objects.find((o): o is TextRun => o.id === textId);
      expect(strokedText?.renderMode).toBe('stroke');

      // 8. reorderObject
      await engine.mutate(doc, 0, [
        {
          type: 'reorderObject',
          objectId: textId,
          newZIndex: 0
        }
      ]);

      objects = await engine.getPageObjects(doc, 0);
      expect(objects.length).toBeGreaterThan(0);

      await engine.close(doc);
    });
  });

  describe('MockPdfEngine parity', () => {
    const mock = new MockPdfEngine();

    it('applies all mutations consistently on MockPdfEngine', async () => {
      const doc = await mock.open(singleColPdfBytes.buffer.slice(0));
      const initial = await mock.getPageObjects(doc, 0);

      // Remove
      await mock.mutate(doc, 0, [{ type: 'removeObject', objectId: initial[0]!.id }]);
      let objs = await mock.getPageObjects(doc, 0);
      expect(objs.length).toBe(initial.length - 1);

      // Insert text
      await mock.mutate(doc, 0, [
        {
          type: 'insertTextObject',
          text: 'Mock Inserted Text',
          fontSize: 16,
          matrix: [1, 0, 0, 1, 100, 200]
        }
      ]);
      objs = await mock.getPageObjects(doc, 0);
      const inserted = objs.find(
        (o): o is TextRun => o.type === 'text' && o.text === 'Mock Inserted Text'
      );
      expect(inserted).toBeDefined();

      // Set matrix
      await mock.mutate(doc, 0, [
        {
          type: 'setMatrix',
          objectId: inserted!.id,
          matrix: [1, 0, 0, 1, 250, 350]
        }
      ]);
      objs = await mock.getPageObjects(doc, 0);
      const moved = objs.find((o) => o.id === inserted!.id);
      expect(moved?.matrix[4]).toBe(250);

      // Set color & renderMode
      await mock.mutate(doc, 0, [
        {
          type: 'setColor',
          objectId: inserted!.id,
          fillColor: { r: 255, g: 0, b: 0, a: 255 }
        },
        {
          type: 'setTextRenderMode',
          objectId: inserted!.id,
          renderMode: 'stroke'
        }
      ]);
      objs = await mock.getPageObjects(doc, 0);
      const colored = objs.find((o): o is TextRun => o.id === inserted!.id);
      expect(colored?.fillColor.r).toBe(255);
      expect(colored?.renderMode).toBe('stroke');

      await mock.close(doc);
    });
  });
});
