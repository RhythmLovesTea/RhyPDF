import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  validateLinkSafety,
  getPdfMetadata,
  setPdfMetadata,
  stripAllMetadata,
  rectsOverlap,
  applyTrueRedaction,
  ApplyRedactionCommand,
  encryptPdf,
  decryptPdf,
  PDF_PERMISSIONS,
  type RedactionArea
} from '../src/security';
import type { TextRun, PageObject } from '@rhypdf/pdf-model';

async function createSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 700]);
  page.drawText('Confidential Social Security Number: 123-45-6789', { x: 50, y: 600, size: 12 });
  doc.setTitle('Original Title');
  doc.setAuthor('Original Author');
  doc.setSubject('Original Subject');
  doc.setKeywords(['secret', 'confidential']);
  return await doc.save();
}

describe('Phase 15: Security and Utilities operations', () => {
  describe('Task 15.9: Link and action safety', () => {
    it('blocks dangerous URL schemes (javascript, data, file, vbscript, blob)', () => {
      expect(validateLinkSafety('javascript:alert(1)').isSafe).toBe(false);
      expect(validateLinkSafety('JAVASCRIPT:void(0)').isSafe).toBe(false);
      expect(validateLinkSafety('data:text/html,<script>alert(1)</script>').isSafe).toBe(false);
      expect(validateLinkSafety('file:///C:/Windows/System32/cmd.exe').isSafe).toBe(false);
      expect(validateLinkSafety('vbscript:msgbox(1)').isSafe).toBe(false);
      expect(validateLinkSafety('blob:http://localhost/uuid').isSafe).toBe(false);
      expect(validateLinkSafety('').isSafe).toBe(false);
    });

    it('permits safe web links with confirmation flag', () => {
      const httpsCheck = validateLinkSafety('https://google.com/search?q=pdf');
      expect(httpsCheck.isSafe).toBe(true);
      expect(httpsCheck.protocol).toBe('https:');
      expect(httpsCheck.requiresConfirmation).toBe(true);

      const httpCheck = validateLinkSafety('http://example.org');
      expect(httpCheck.isSafe).toBe(true);
      expect(httpCheck.protocol).toBe('http:');
      expect(httpCheck.requiresConfirmation).toBe(true);
    });

    it('permits mailto and tel links directly without confirmation', () => {
      const mailtoCheck = validateLinkSafety('mailto:support@rhypdf.app');
      expect(mailtoCheck.isSafe).toBe(true);
      expect(mailtoCheck.protocol).toBe('mailto:');
      expect(mailtoCheck.requiresConfirmation).toBe(false);

      const telCheck = validateLinkSafety('tel:+18005550199');
      expect(telCheck.isSafe).toBe(true);
      expect(telCheck.protocol).toBe('tel:');
      expect(telCheck.requiresConfirmation).toBe(false);
    });
  });

  describe('Task 15.4: Metadata editor and stripper', () => {
    it('reads and updates document metadata', async () => {
      const bytes = await createSamplePdf();
      const meta = await getPdfMetadata(bytes);

      expect(meta.title).toBe('Original Title');
      expect(meta.author).toBe('Original Author');
      expect(meta.keywords).toContain('secret');

      const updatedBytes = await setPdfMetadata(bytes, {
        title: 'New Cleared Title',
        author: 'New Auditor',
        keywords: ['audited', 'public']
      });

      const updatedMeta = await getPdfMetadata(updatedBytes);
      expect(updatedMeta.title).toBe('New Cleared Title');
      expect(updatedMeta.author).toBe('New Auditor');
      expect(updatedMeta.keywords).toContain('public');
    });

    it('strips all metadata from PDF', async () => {
      const bytes = await createSamplePdf();
      const strippedBytes = await stripAllMetadata(bytes);
      const cleanMeta = await getPdfMetadata(strippedBytes);

      expect(cleanMeta.title).toBe('');
      expect(cleanMeta.author).toBe('');
      expect(cleanMeta.keywords?.length).toBe(0);
    });
  });

  describe('Task 15.3: True Redaction', () => {
    it('accurately identifies overlapping bounding boxes', () => {
      const r1 = { left: 50, bottom: 580, right: 300, top: 620 };
      const r2 = { left: 100, bottom: 590, right: 250, top: 610 };
      const r3 = { left: 400, bottom: 100, right: 450, top: 150 };

      expect(rectsOverlap(r1, r2)).toBe(true);
      expect(rectsOverlap(r1, r3)).toBe(false);
    });

    it('permanently purges underlying text runs and replaces with visual blackout', async () => {
      const bytes = await createSamplePdf();

      const sensitiveText: TextRun = {
        id: 'text-ssn-1',
        type: 'text',
        text: 'SSN: 123-45-6789',
        fontSize: 12,
        bounds: { left: 50, bottom: 590, right: 200, top: 610 },
        matrix: [1, 0, 0, 1, 50, 600],
        zIndex: 10,
        isEmbeddedSubset: false
      };

      const safeText: TextRun = {
        id: 'text-header-1',
        type: 'text',
        text: 'Public Report Header',
        fontSize: 14,
        bounds: { left: 50, bottom: 650, right: 250, top: 680 },
        matrix: [1, 0, 0, 1, 50, 660],
        zIndex: 10,
        isEmbeddedSubset: false
      };

      const objectsMap = new Map<number, PageObject[]>();
      objectsMap.set(0, [sensitiveText, safeText]);

      const redaction: RedactionArea = {
        id: 'red-1',
        pageIndex: 0,
        bounds: { left: 40, bottom: 580, right: 210, top: 620 },
        overlayText: '[REDACTED]'
      };

      const result = await applyTrueRedaction(bytes, [redaction], objectsMap);

      expect(result.result.removedTextRunCount).toBe(1);
      expect(result.result.redactedAreasCount).toBe(1);

      const page0Objects = result.updatedObjectsMap.get(0)!;
      // Sensitive text run must NOT exist in updated objects!
      expect(page0Objects.some((o) => o.id === 'text-ssn-1')).toBe(false);
      // Safe text run remains
      expect(page0Objects.some((o) => o.id === 'text-header-1')).toBe(true);
      // Blackout rectangle was created
      expect(page0Objects.some((o) => o.id.includes('redaction-blackout-'))).toBe(true);
      // Overlay text run was created
      expect(page0Objects.some((o) => o.id.includes('redaction-label-'))).toBe(true);
    });

    it('supports undo and redo via ApplyRedactionCommand', async () => {
      const bytesA = new Uint8Array([1, 2, 3]);
      const bytesB = new Uint8Array([4, 5, 6]);
      const mapA = new Map([[0, []]]);
      const mapB = new Map([[0, []]]);

      let activeBytes = bytesA;
      const callback = vi.fn((b) => {
        activeBytes = b;
      });

      const cmd = new ApplyRedactionCommand(0, bytesA, bytesB, mapA, mapB, callback);

      await cmd.apply();
      expect(activeBytes).toBe(bytesB);

      await cmd.revert();
      expect(activeBytes).toBe(bytesA);
    });
  });

  describe('Task 15.1 & 15.2: encryptPdf and decryptPdf', () => {
    it('calls engine save with password and permissions for encryption', async () => {
      const mockDoc = 'doc-encrypt-test';
      const mockBlob = new Blob([new Uint8Array([37, 80, 68, 70])]);
      const mockEngine = {
        open: vi.fn().mockResolvedValue(mockDoc),
        save: vi.fn().mockResolvedValue(mockBlob),
        close: vi.fn().mockResolvedValue(undefined)
      };

      const raw = new Uint8Array([1, 2, 3]);
      const encrypted = await encryptPdf(
        raw,
        {
          userPassword: 'secretUserPass',
          ownerPassword: 'secretOwnerPass',
          permissions: PDF_PERMISSIONS.PRINT | PDF_PERMISSIONS.COPY
        },
        mockEngine
      );

      expect(encrypted.byteLength).toBe(4);
      expect(mockEngine.open).toHaveBeenCalledWith(raw);
      expect(mockEngine.save).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({
          password: 'secretUserPass',
          ownerPassword: 'secretOwnerPass',
          permissions: PDF_PERMISSIONS.PRINT | PDF_PERMISSIONS.COPY
        })
      );
      expect(mockEngine.close).toHaveBeenCalledWith(mockDoc);
    });

    it('calls engine save with stripSecurity for decryption', async () => {
      const mockDoc = 'doc-decrypt-test';
      const mockBlob = new Blob([new Uint8Array([37, 80, 68, 70])]);
      const mockEngine = {
        open: vi.fn().mockResolvedValue(mockDoc),
        save: vi.fn().mockResolvedValue(mockBlob),
        close: vi.fn().mockResolvedValue(undefined)
      };

      const raw = new Uint8Array([1, 2, 3]);
      const decrypted = await decryptPdf(raw, 'userPass123', mockEngine);

      expect(decrypted.byteLength).toBe(4);
      expect(mockEngine.open).toHaveBeenCalledWith(raw, { password: 'userPass123' });
      expect(mockEngine.save).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({
          stripSecurity: true
        })
      );
      expect(mockEngine.close).toHaveBeenCalledWith(mockDoc);
    });
  });
});
