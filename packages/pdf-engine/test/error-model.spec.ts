import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as Comlink from 'comlink';
import {
  PdfError,
  isPdfError,
  mapPdfiumErrorCode,
  mapToPdfError,
  PdfiumEngine,
  MockPdfEngine,
  WorkerPdfEngine,
  EngineService
} from '../src/index';

const FIXTURES_DIR = resolve(__dirname, '../../test-fixtures/fixtures');

describe('Task 2.14: Error model (PdfError union & engine error mapping)', () => {
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

  describe('PdfError and type guard', () => {
    it('constructs PdfError with code, message, and cause', () => {
      const cause = new Error('Underlying cause');
      const err = new PdfError('Corrupt', 'Corrupted file', cause);

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(PdfError);
      expect(err.name).toBe('PdfError');
      expect(err.code).toBe('Corrupt');
      expect(err.message).toBe('Corrupted file');
      expect(err.cause).toBe(cause);
    });

    it('identifies PdfError using isPdfError type guard', () => {
      const err = new PdfError('WrongPassword', 'Invalid password');
      expect(isPdfError(err)).toBe(true);
      expect(isPdfError(err, 'WrongPassword')).toBe(true);
      expect(isPdfError(err, 'Corrupt')).toBe(false);

      // Deserialized object from worker boundary
      const deserialized = { name: 'PdfError', code: 'WrongPassword', message: 'test' };
      expect(isPdfError(deserialized)).toBe(false); // not instanceof Error

      const deserializedError = new Error('test');
      deserializedError.name = 'PdfError';
      (deserializedError as unknown as { code: string }).code = 'WrongPassword';
      expect(isPdfError(deserializedError, 'WrongPassword')).toBe(true);

      expect(isPdfError(new Error('plain'))).toBe(false);
      expect(isPdfError(null)).toBe(false);
      expect(isPdfError(undefined)).toBe(false);
    });

    it('maps PDFium error codes correctly via mapPdfiumErrorCode', () => {
      expect(mapPdfiumErrorCode(4, false).code).toBe('PasswordRequired');
      expect(mapPdfiumErrorCode(4, true).code).toBe('WrongPassword');
      expect(mapPdfiumErrorCode(3).code).toBe('Corrupt');
      expect(mapPdfiumErrorCode(2).code).toBe('IO');
      expect(mapPdfiumErrorCode(5).code).toBe('Unsupported');
      expect(mapPdfiumErrorCode(6).code).toBe('Unsupported');
      expect(mapPdfiumErrorCode(999).code).toBe('Unknown');
    });

    it('maps unknown and abort errors safely via mapToPdfError', () => {
      const abortErr = new Error('Render cancelled by user');
      expect(mapToPdfError(abortErr).code).toBe('Cancelled');

      const oomErr = new Error('Out of Memory in WASM heap');
      expect(mapToPdfError(oomErr).code).toBe('OutOfMemory');

      const genericErr = new Error('generic failure');
      expect(mapToPdfError(genericErr, 'IO').code).toBe('IO');

      const strErr = mapToPdfError('some error string');
      expect(strErr.code).toBe('Unknown');
      expect(strErr.message).toBe('some error string');
    });
  });

  describe('PdfiumEngine error mapping across scenarios', () => {
    it('throws Corrupt on empty document buffer', async () => {
      await expect(engine.open(new ArrayBuffer(0))).rejects.toSatisfy((err: unknown) =>
        isPdfError(err, 'Corrupt')
      );
    });

    it('throws Corrupt on truncated invalid PDF', async () => {
      const corruptBuf = readFileSync(resolve(FIXTURES_DIR, '12_corrupt_truncated.pdf'));
      const input = corruptBuf.buffer.slice(
        corruptBuf.byteOffset,
        corruptBuf.byteOffset + corruptBuf.byteLength
      );

      await expect(engine.open(input)).rejects.toSatisfy((err: unknown) =>
        isPdfError(err, 'Corrupt')
      );
    });

    it('throws PasswordRequired on encrypted PDF without password', async () => {
      const encBuf = readFileSync(resolve(FIXTURES_DIR, '06_encrypted.pdf'));
      const input = encBuf.buffer.slice(encBuf.byteOffset, encBuf.byteOffset + encBuf.byteLength);

      await expect(engine.open(input)).rejects.toSatisfy((err: unknown) =>
        isPdfError(err, 'PasswordRequired')
      );
    });

    it('throws WrongPassword on encrypted PDF with incorrect password', async () => {
      const encBuf = readFileSync(resolve(FIXTURES_DIR, '06_encrypted.pdf'));
      const input = encBuf.buffer.slice(encBuf.byteOffset, encBuf.byteOffset + encBuf.byteLength);

      await expect(engine.open(input, { password: 'bad_password_123' })).rejects.toSatisfy(
        (err: unknown) => isPdfError(err, 'WrongPassword')
      );
    });

    it('throws Unsupported when accessing an out-of-bounds page', async () => {
      const singleColBuf = readFileSync(resolve(FIXTURES_DIR, '01_text_single_column.pdf'));
      const input = singleColBuf.buffer.slice(
        singleColBuf.byteOffset,
        singleColBuf.byteOffset + singleColBuf.byteLength
      );
      const doc = await engine.open(input);

      await expect(engine.pageInfo(doc, 99)).rejects.toSatisfy((err: unknown) =>
        isPdfError(err, 'Unsupported')
      );

      await engine.close(doc);
    });

    it('throws IO when accessing an invalid or already closed document handle', async () => {
      await expect(engine.pageCount('non-existent-handle-404')).rejects.toSatisfy((err: unknown) =>
        isPdfError(err, 'IO')
      );
    });

    it('throws Cancelled when renderPage signal is pre-aborted', async () => {
      const singleColBuf = readFileSync(resolve(FIXTURES_DIR, '01_text_single_column.pdf'));
      const input = singleColBuf.buffer.slice(
        singleColBuf.byteOffset,
        singleColBuf.byteOffset + singleColBuf.byteLength
      );
      const doc = await engine.open(input);

      const controller = new AbortController();
      controller.abort();

      await expect(
        engine.renderPage(doc, 0, { scale: 1, dpr: 1 }, controller.signal)
      ).rejects.toSatisfy((err: unknown) => isPdfError(err, 'Cancelled'));

      await engine.close(doc);
    });
  });

  describe('WorkerPdfEngine RPC error normalization', () => {
    it('reconstitutes serialized worker errors as genuine PdfError instances on the host', async () => {
      const { port1, port2 } = new MessageChannel();
      const service = new EngineService(new MockPdfEngine());
      Comlink.expose(service, port1);

      const hostEngine = new WorkerPdfEngine(port2);

      // Calling closed doc across worker RPC should yield a proper PdfError('IO')
      try {
        await hostEngine.pageCount('non-existent-handle');
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect(isPdfError(err, 'IO')).toBe(true);
        expect(err).toBeInstanceOf(PdfError);
      } finally {
        hostEngine.terminate();
        port1.close();
        port2.close();
      }
    });
  });
});
