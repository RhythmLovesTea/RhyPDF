import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfiumEngine, MockPdfEngine, PdfError } from '../src/index';

/**
 * Creates a valid 100 MB PDF Blob using sparse slicing.
 * The PDF is structurally valid with a 100 MB uncompressed stream,
 * allowing PDFium to read xref and trailer without buffering 100 MB into memory.
 */
function createSparse100MbPdfBlob(): Blob {
  const streamLen = 100 * 1024 * 1024; // 100 MB stream
  const header =
    '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>\nendobj\n4 0 obj\n<< /Length ' +
    streamLen +
    ' >>\nstream\n';
  const headerBytes = new TextEncoder().encode(header);
  const obj4Offset = header.indexOf('4 0 obj');
  const footerPrefix = '\nendstream\nendobj\n';
  const xrefOffset = headerBytes.length + streamLen + footerPrefix.length;

  const footer =
    footerPrefix +
    'xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
    String(obj4Offset).padStart(10, '0') +
    ' 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n' +
    xrefOffset +
    '\n%%EOF';
  const footerBytes = new TextEncoder().encode(footer);
  const totalLen = headerBytes.length + streamLen + footerBytes.length;

  return {
    size: totalLen,
    type: 'application/pdf',
    readChunkSync(start: number, size: number): Uint8Array {
      const chunk = new Uint8Array(size);
      chunk.fill(0x20); // space fill
      if (start < headerBytes.length) {
        const avail = Math.min(size, headerBytes.length - start);
        chunk.set(headerBytes.subarray(start, start + avail), 0);
      }
      const footerStart = headerBytes.length + streamLen;
      if (start + size > footerStart) {
        const fOffset = Math.max(0, start - footerStart);
        const chunkOffset = Math.max(0, footerStart - start);
        const avail = Math.min(size - chunkOffset, footerBytes.length - fOffset);
        if (avail > 0 && fOffset < footerBytes.length) {
          chunk.set(footerBytes.subarray(fOffset, fOffset + avail), chunkOffset);
        }
      }
      return chunk;
    },
    slice(start = 0, end = totalLen): Blob {
      const sliceLen = Math.max(0, end - start);
      return {
        size: sliceLen,
        type: 'application/pdf',
        async arrayBuffer() {
          return new Uint8Array(sliceLen).buffer;
        },
        slice: () => createSparse100MbPdfBlob()
      } as unknown as Blob;
    },
    async arrayBuffer() {
      return headerBytes.buffer;
    }
  } as unknown as Blob;
}

describe('Task 2.4: Open document from ArrayBuffer / Blob, passwords, and chunked reads', () => {
  let engine: PdfiumEngine;
  let wasmBinary: ArrayBuffer;
  let standardPdfBytes: Uint8Array;
  let encryptedPdfBytes: Uint8Array;
  let corruptPdfBytes: Uint8Array;

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
    encryptedPdfBytes = new Uint8Array(fs.readFileSync(path.join(fixturesDir, '06_encrypted.pdf')));
    corruptPdfBytes = new Uint8Array(
      fs.readFileSync(path.join(fixturesDir, '12_corrupt_truncated.pdf'))
    );

    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('Standard ArrayBuffer and Blob loading', () => {
    it('opens standard PDF from ArrayBuffer and retrieves page count & info', async () => {
      const handle = await engine.open(standardPdfBytes.buffer.slice(0));
      expect(typeof handle).toBe('string');
      expect(handle).toMatch(/^pdf-doc-\d+$/);

      const count = await engine.pageCount(handle);
      expect(count).toBe(1);

      const info = await engine.pageInfo(handle, 0);
      expect(info.pageIndex).toBe(0);
      expect(info.width).toBeCloseTo(595.28, 0);
      expect(info.height).toBeCloseTo(841.89, 0);
      expect(info.rotation).toBe(0);

      await engine.close(handle);
      await expect(engine.pageCount(handle)).rejects.toMatchObject({ code: 'IO' });
    });

    it('opens standard PDF from Blob and queries page info', async () => {
      const blob = new Blob([standardPdfBytes.buffer.slice(0)], { type: 'application/pdf' });
      const handle = await engine.open(blob);

      const count = await engine.pageCount(handle);
      expect(count).toBe(1);

      const info = await engine.pageInfo(handle, 0);
      expect(info.width).toBeGreaterThan(0);
      expect(info.height).toBeGreaterThan(0);

      await engine.close(handle);
    });
  });

  describe('Password handling and security errors', () => {
    it('throws PasswordRequired when opening encrypted PDF without a password', async () => {
      await expect(engine.open(encryptedPdfBytes.buffer.slice(0))).rejects.toThrow(PdfError);
      await expect(engine.open(encryptedPdfBytes.buffer.slice(0))).rejects.toMatchObject({
        code: 'PasswordRequired'
      });
    });

    it('throws WrongPassword when opening encrypted PDF with wrong password', async () => {
      await expect(
        engine.open(encryptedPdfBytes.buffer.slice(0), { password: 'incorrect-password-xyz' })
      ).rejects.toMatchObject({
        code: 'WrongPassword'
      });
    });

    it('opens encrypted PDF successfully with the correct password', async () => {
      const handle = await engine.open(encryptedPdfBytes.buffer.slice(0), {
        password: 'secret123'
      });
      expect(handle).toBeDefined();

      const count = await engine.pageCount(handle);
      expect(count).toBe(1);

      await engine.close(handle);
    });
  });

  describe('Corrupt and invalid inputs', () => {
    it('throws Corrupt on empty ArrayBuffer', async () => {
      const empty = new ArrayBuffer(0);
      await expect(engine.open(empty)).rejects.toMatchObject({
        code: 'Corrupt'
      });
    });

    it('throws Corrupt on truncated / corrupt PDF data', async () => {
      await expect(engine.open(corruptPdfBytes.buffer.slice(0))).rejects.toMatchObject({
        code: 'Corrupt'
      });
    });
  });

  describe('Chunked reads for large 100 MB files (per Task 0.9 & 2.4)', () => {
    it('opens a 100 MB file via custom chunked reader without excessive WASM heap allocation', async () => {
      const sparse100MBBlob = createSparse100MbPdfBlob();
      expect(sparse100MBBlob.size).toBeGreaterThanOrEqual(100 * 1024 * 1024);

      const handle = await engine.open(sparse100MBBlob);
      expect(handle).toBeDefined();

      const count = await engine.pageCount(handle);
      expect(count).toBe(1);

      const info = await engine.pageInfo(handle, 0);
      expect(info.width).toBeCloseTo(595, 0);
      expect(info.height).toBeCloseTo(842, 0);

      await engine.close(handle);
    });
  });

  describe('MockPdfEngine contract parity', () => {
    const mock = new MockPdfEngine();

    it('throws WrongPassword on wrong password', async () => {
      await expect(
        mock.open(standardPdfBytes.buffer.slice(0), { password: 'wrong_password' })
      ).rejects.toMatchObject({
        code: 'WrongPassword'
      });
    });

    it('throws PasswordRequired on encrypted simulation without password', async () => {
      const encryptedSim = { __encrypted: true, byteLength: 1000 } as unknown as ArrayBuffer;
      await expect(mock.open(encryptedSim)).rejects.toMatchObject({
        code: 'PasswordRequired'
      });
    });
  });
});
