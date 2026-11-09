import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PdfiumEngine, MockPdfEngine } from '../src/index';
import type { TextRun } from '@rhypdf/pdf-model';

const FIXTURES_DIR = resolve(__dirname, '../../test-fixtures/fixtures');

describe('Task 2.12: Save to new file (full, incremental, streaming, source immutability)', () => {
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

  describe('PdfiumEngine.save', () => {
    it('never mutates source input bytes during open, mutation, and save', async () => {
      const sourceBuffer = readFileSync(resolve(FIXTURES_DIR, '01_text_single_column.pdf'));
      // Keep an immutable snapshot of original bytes
      const originalBytesCopy = new Uint8Array(sourceBuffer).slice();
      const inputBuffer = sourceBuffer.buffer.slice(
        sourceBuffer.byteOffset,
        sourceBuffer.byteOffset + sourceBuffer.byteLength
      );

      const doc = await engine.open(inputBuffer);

      // Mutate page 0 by inserting text
      await engine.mutate(doc, 0, [
        {
          type: 'insertText',
          text: 'Saved Without Mutating Original',
          fontSize: 16,
          matrix: [1, 0, 0, 1, 100, 500]
        }
      ]);

      const savedBlob = await engine.save(doc);

      // Verify the source buffer remains 100% bit-for-bit unchanged
      const inputBytesAfter = new Uint8Array(inputBuffer);
      expect(inputBytesAfter.length).toBe(originalBytesCopy.length);
      for (let i = 0; i < originalBytesCopy.length; i++) {
        if (inputBytesAfter[i] !== originalBytesCopy[i]) {
          throw new Error(`Byte mismatch at index ${i}: source buffer was mutated!`);
        }
      }

      // Verify saved blob is valid and distinct
      expect(savedBlob).toBeInstanceOf(Blob);
      expect(savedBlob.size).toBeGreaterThan(0);
      expect(savedBlob.type).toBe('application/pdf');

      await engine.close(doc);
    });

    it('performs full rewrite save and produces valid reopenable PDF', async () => {
      const sourceBuffer = readFileSync(resolve(FIXTURES_DIR, '01_text_single_column.pdf'));
      const doc = await engine.open(sourceBuffer.buffer.slice(0));

      // Remove an object and insert a new text object
      const initialObjects = await engine.getPageObjects(doc, 0);
      const firstText = initialObjects.find((o) => o.type === 'text');
      expect(firstText).toBeDefined();

      await engine.mutate(doc, 0, [
        { type: 'removeObject', objectId: firstText!.id },
        {
          type: 'insertText',
          text: 'Replacement Header Full Rewrite',
          fontSize: 18,
          matrix: [1, 0, 0, 1, 72, 600]
        }
      ]);

      const fullSavedBlob = await engine.save(doc, { incremental: false });
      expect(fullSavedBlob.size).toBeGreaterThan(0);

      // Re-open the saved blob in PDFium to verify it is 100% valid PDF structure
      const savedDoc = await engine.open(fullSavedBlob);
      expect(await engine.pageCount(savedDoc)).toBe(1);

      const savedObjects = await engine.getPageObjects(savedDoc, 0);
      const hasReplacement = savedObjects.some(
        (o) => o.type === 'text' && (o as TextRun).text?.includes('Replacement Header Full Rewrite')
      );
      expect(hasReplacement).toBe(true);

      // Verify rendering of saved document succeeds
      const bitmap = await engine.renderPage(savedDoc, 0, { scale: 1, dpr: 1 });
      expect(bitmap.width).toBeGreaterThan(0);
      expect(bitmap.height).toBeGreaterThan(0);

      await engine.close(doc);
      await engine.close(savedDoc);
    });

    it('performs incremental save option', async () => {
      const sourceBuffer = readFileSync(resolve(FIXTURES_DIR, '01_text_single_column.pdf'));
      const doc = await engine.open(sourceBuffer.buffer.slice(0));

      await engine.mutate(doc, 0, [
        {
          type: 'insertText',
          text: 'Incremental Addition',
          fontSize: 14,
          matrix: [1, 0, 0, 1, 100, 300]
        }
      ]);

      const incrementalBlob = await engine.save(doc, { incremental: true });
      const fullBlob = await engine.save(doc, { incremental: false });

      expect(incrementalBlob.size).toBeGreaterThan(0);
      expect(fullBlob.size).toBeGreaterThan(0);

      // Verify incremental and full rewrite sizes differ due to append vs xref rewrite
      expect(incrementalBlob.size).not.toBe(fullBlob.size);

      // Reopen incremental saved document
      const incDoc = await engine.open(incrementalBlob);
      const incObjects = await engine.getPageObjects(incDoc, 0);
      const found = incObjects.some(
        (o) => o.type === 'text' && (o as TextRun).text?.includes('Incremental Addition')
      );
      expect(found).toBe(true);

      await engine.close(doc);
      await engine.close(incDoc);
    });

    it('saves with explicit PDF version (1.7 / 1.4)', async () => {
      const sourceBuffer = readFileSync(resolve(FIXTURES_DIR, '01_text_single_column.pdf'));
      const doc = await engine.open(sourceBuffer.buffer.slice(0));

      const v14Blob = await engine.save(doc, { version: 14, incremental: false });
      const v14Buffer = await v14Blob.arrayBuffer();
      const v14Text = new TextDecoder().decode(new Uint8Array(v14Buffer.slice(0, 30)));
      expect(v14Text).toContain('%PDF-1.4');

      const v17Blob = await engine.save(doc, { version: 17, incremental: false });
      const v17Buffer = await v17Blob.arrayBuffer();
      const v17Text = new TextDecoder().decode(new Uint8Array(v17Buffer.slice(0, 30)));
      expect(v17Text).toContain('%PDF-1.7');

      await engine.close(doc);
    });

    it('streams saved output to a WritableStream (simulating OPFS destination)', async () => {
      const sourceBuffer = readFileSync(resolve(FIXTURES_DIR, '01_text_single_column.pdf'));
      const doc = await engine.open(sourceBuffer.buffer.slice(0));

      const collectedChunks: Uint8Array[] = [];
      const destination = new WritableStream<Uint8Array>({
        write(chunk) {
          collectedChunks.push(new Uint8Array(chunk));
        }
      });

      const savedBlob = await engine.save(doc, { destination });
      expect(collectedChunks.length).toBeGreaterThan(0);

      const totalStreamedBytes = collectedChunks.reduce((acc, c) => acc + c.byteLength, 0);
      expect(totalStreamedBytes).toBe(savedBlob.size);

      // Verify concatenated bytes match blob bytes
      const streamedBytes = new Uint8Array(totalStreamedBytes);
      let offset = 0;
      for (const chunk of collectedChunks) {
        streamedBytes.set(chunk, offset);
        offset += chunk.byteLength;
      }

      const blobBytes = new Uint8Array(await savedBlob.arrayBuffer());
      expect(streamedBytes).toEqual(blobBytes);

      await engine.close(doc);
    });
  });

  describe('MockPdfEngine.save', () => {
    it('implements full, incremental, and streaming save options', async () => {
      const mock = new MockPdfEngine();
      const doc = await mock.open(new ArrayBuffer(100));

      const fullBlob = await mock.save(doc, { incremental: false, version: 17 });
      const fullText = await fullBlob.text();
      expect(fullText).toContain('%PDF-1.7');
      expect(fullText).toContain('Full');

      const incBlob = await mock.save(doc, { incremental: true, version: 14 });
      const incText = await incBlob.text();
      expect(incText).toContain('%PDF-1.4');
      expect(incText).toContain('Incremental');

      const collected: Uint8Array[] = [];
      const destination = new WritableStream<Uint8Array>({
        write(chunk) {
          collected.push(chunk);
        }
      });
      const streamedBlob = await mock.save(doc, { destination });
      const streamedText = new TextDecoder().decode(collected[0]);
      expect(streamedText).toBe(await streamedBlob.text());

      await mock.close(doc);
    });
  });
});
