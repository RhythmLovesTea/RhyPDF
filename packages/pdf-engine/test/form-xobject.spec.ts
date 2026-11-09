import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PdfiumEngine, MockPdfEngine } from '../src/index';
import type { FormObject, TextRun } from '@rhypdf/pdf-model';

async function buildFormXObjectPdf(): Promise<Uint8Array> {
  const subDoc = await PDFDocument.create();
  const subPage = subDoc.addPage([200, 100]);
  const font = await subDoc.embedFont(StandardFonts.Helvetica);
  subPage.drawText('Form XObject Inner Text', { x: 20, y: 50, size: 12, font });
  const subBytes = await subDoc.save();

  const doc = await PDFDocument.create();
  const [embedded] = await doc.embedPdf(subBytes);

  const page = doc.addPage([500, 400]);
  const font2 = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Page Root Text', { x: 50, y: 350, size: 16, font: font2 });
  page.drawPage(embedded, { x: 100, y: 200 });

  return await doc.save({ useObjectStreams: false });
}

describe('Task 2.10: Form XObject traversal and editing', () => {
  let engine: PdfiumEngine;
  let wasmBinary: ArrayBuffer;
  let formPdfBytes: Uint8Array;

  beforeAll(async () => {
    const wasmPath = path.resolve(
      __dirname,
      '../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = fs.readFileSync(wasmPath).buffer;
    formPdfBytes = await buildFormXObjectPdf();
    engine = await PdfiumEngine.create({ wasmBinary });
  });

  it('enumerates Form XObject and traverses its child objects with transform composition', async () => {
    const doc = await engine.open(formPdfBytes.buffer.slice(0));
    const objects = await engine.getPageObjects(doc, 0);

    // Expect page-level objects: 1 root text, 1 form XObject
    expect(objects.length).toBeGreaterThanOrEqual(2);

    const rootText = objects.find(
      (o) => o.type === 'text' && (o as TextRun).text.includes('Page Root Text')
    );
    expect(rootText).toBeDefined();

    const formObj = objects.find((o): o is FormObject => o.type === 'form');
    expect(formObj).toBeDefined();

    if (formObj) {
      expect(formObj.subObjects.length).toBeGreaterThanOrEqual(1);
      const innerText = formObj.subObjects.find((o): o is TextRun => o.type === 'text');
      expect(innerText).toBeDefined();
      expect(innerText?.text).toContain('Form XObject Inner Text');

      // Verify parentFormChain
      expect(innerText?.parentFormChain).toBeDefined();
      expect(innerText?.parentFormChain).toContain(formObj.id);

      // Verify transform composition: Form matrix was translated to (100, 200)
      expect(innerText?.bounds.left).toBeGreaterThanOrEqual(100);
      expect(innerText?.bounds.bottom).toBeGreaterThanOrEqual(200);
    }

    await engine.close(doc);
  });

  it('removes text inside a Form XObject and regenerates page content', async () => {
    const doc = await engine.open(formPdfBytes.buffer.slice(0));
    let objects = await engine.getPageObjects(doc, 0);

    const formObj = objects.find((o): o is FormObject => o.type === 'form');
    expect(formObj).toBeDefined();
    expect(formObj?.subObjects.length).toBe(1);

    const innerText = formObj!.subObjects[0]!;
    expect(innerText.id).toBeDefined();

    // Remove the inner text object inside the Form XObject
    const result = await engine.mutate(doc, 0, [
      {
        type: 'removeObject',
        objectId: innerText.id
      }
    ]);
    expect(result.success).toBe(true);

    // Re-enumerate page objects to verify child object is removed
    objects = await engine.getPageObjects(doc, 0);
    const updatedForm = objects.find((o): o is FormObject => o.type === 'form');
    expect(updatedForm).toBeDefined();
    expect(updatedForm?.subObjects.length).toBe(0);

    await engine.close(doc);
  });

  describe('MockPdfEngine parity', () => {
    const mock = new MockPdfEngine();

    it('traverses and removes text inside Form XObject in MockPdfEngine', async () => {
      const doc = await mock.open(formPdfBytes.buffer.slice(0));
      let objects = await mock.getPageObjects(doc, 1);

      const formObj = objects.find((o): o is FormObject => o.type === 'form');
      expect(formObj).toBeDefined();
      expect(formObj?.subObjects.length).toBe(1);

      const childText = formObj!.subObjects[0]!;
      expect(childText.id).toBe('form-1-text-1');

      // Remove the child text inside form
      const result = await mock.mutate(doc, 1, [
        {
          type: 'removeObject',
          objectId: childText.id
        }
      ]);
      expect(result.success).toBe(true);

      // Verify removal
      objects = await mock.getPageObjects(doc, 1);
      const updatedForm = objects.find((o): o is FormObject => o.type === 'form');
      expect(updatedForm).toBeDefined();
      expect(updatedForm?.subObjects.length).toBe(0);

      await mock.close(doc);
    });
  });
});
