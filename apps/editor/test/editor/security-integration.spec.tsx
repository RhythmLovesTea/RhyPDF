import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import { PDFDocument } from 'pdf-lib';
import {
  PasswordSecurityDialog,
  RedactionDialog,
  MetadataEditorDialog,
  LocalDataLockDialog,
  ClearDataConfirmDialog,
  ExternalLinkConfirmDialog
} from '../../src/features/security';
import { PrivacyPolicyPage } from '../../src/features/privacy/PrivacyPolicyPage';
import {
  validateLinkSafety,
  getPdfMetadata,
  setPdfMetadata,
  stripAllMetadata,
  applyTrueRedaction,
  ApplyRedactionCommand,
  encryptPdf,
  decryptPdf,
  PDF_PERMISSIONS,
  type RedactionArea
} from '@rhypdf/edit-core';
import type { TextRun, PageObject } from '@rhypdf/pdf-model';
import {
  isLocalDataLockEnabled,
  setLocalDataLockPassphrase,
  verifyPassphrase,
  removeLocalDataLock
} from '../../src/lib/localDataLock';
import {
  wipeDocumentWorkingData,
  clearAllLocalData,
  pruneExpiredRecovery
} from '../../src/lib/secureStorage';
import { saveRecoveryMetadata, getRecoveryMetadata } from '../../src/lib/recovery';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, val: string) => {
    mockStorage[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  }),
  get length() {
    return Object.keys(mockStorage).length;
  },
  key: vi.fn((i: number) => Object.keys(mockStorage)[i] || null)
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

function triggerInputChange(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function createSamplePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 700]);
  page.drawText('Confidential Social Security Number: 123-45-6789', { x: 50, y: 600, size: 12 });
  doc.setTitle('Financial Audit 2026');
  doc.setAuthor('Security Auditor');
  doc.setSubject('Top Secret');
  doc.setKeywords(['confidential', 'audit', 'ssn']);
  return await doc.save();
}

describe('Phase 15 UI Integration: Security and Utilities', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('Task 15.1 & 15.2: PasswordSecurityDialog, encryptPdf & decryptPdf', () => {
    it('renders password security dialog, configures permissions and invokes onApplyPassword', async () => {
      const onApplyPassword = vi.fn();
      const onRemovePassword = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <PasswordSecurityDialog
            isOpen={true}
            isCurrentlyEncrypted={false}
            onClose={onClose}
            onApplyPassword={onApplyPassword}
            onRemovePassword={onRemovePassword}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-password-security"]');
      expect(dialog).not.toBeNull();

      const userInput = document.querySelector(
        '[data-testid="input-user-password"]'
      ) as HTMLInputElement;
      const ownerInput = document.querySelector(
        '[data-testid="input-owner-password"]'
      ) as HTMLInputElement;

      act(() => {
        triggerInputChange(userInput, 'UserSecret123!');
        triggerInputChange(ownerInput, 'OwnerSecret456!');
      });

      const permPrint = document.querySelector(
        '[data-testid="perm-allow-print"]'
      ) as HTMLInputElement;
      expect(permPrint.checked).toBe(true);

      const btnApply = document.querySelector(
        '[data-testid="btn-apply-password"]'
      ) as HTMLButtonElement;
      act(() => {
        btnApply.click();
      });

      expect(onApplyPassword).toHaveBeenCalledTimes(1);
      expect(onApplyPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          userPassword: 'UserSecret123!',
          ownerPassword: 'OwnerSecret456!',
          permissions: expect.any(Number)
        })
      );
    });

    it('renders remove security button when document is encrypted and invokes onRemovePassword', async () => {
      const onApplyPassword = vi.fn();
      const onRemovePassword = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <PasswordSecurityDialog
            isOpen={true}
            isCurrentlyEncrypted={true}
            onClose={onClose}
            onApplyPassword={onApplyPassword}
            onRemovePassword={onRemovePassword}
          />
        );
      });

      const btnRemove = document.querySelector(
        '[data-testid="btn-remove-security"]'
      ) as HTMLButtonElement;
      expect(btnRemove).not.toBeNull();

      act(() => {
        btnRemove.click();
      });

      expect(onRemovePassword).toHaveBeenCalledTimes(1);
    });

    it('encrypts and decrypts PDF through engine delegation', async () => {
      const mockDoc = 'doc-sec-test';
      const mockBlob = new Blob([new Uint8Array([37, 80, 68, 70])]);
      const mockEngine = {
        open: vi.fn().mockResolvedValue(mockDoc),
        save: vi.fn().mockResolvedValue(mockBlob),
        close: vi.fn().mockResolvedValue(undefined)
      };

      const bytes = new Uint8Array([1, 2, 3]);
      const enc = await encryptPdf(
        bytes,
        { userPassword: 'pass', ownerPassword: 'owner', permissions: PDF_PERMISSIONS.PRINT },
        mockEngine
      );
      expect(enc.byteLength).toBe(4);
      expect(mockEngine.save).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({
          password: 'pass',
          ownerPassword: 'owner',
          permissions: PDF_PERMISSIONS.PRINT
        })
      );

      const dec = await decryptPdf(bytes, 'pass', mockEngine);
      expect(dec.byteLength).toBe(4);
      expect(mockEngine.save).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({
          stripSecurity: true
        })
      );
    });
  });

  describe('Task 15.3: RedactionDialog and True Redaction', () => {
    it('renders redaction dialog with permanent warning banner and coordinates input', async () => {
      const onApplyRedaction = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <RedactionDialog
            isOpen={true}
            pageIndex={0}
            initialBounds={{ left: 50, bottom: 580, width: 200, height: 40 }}
            onClose={onClose}
            onApplyRedaction={onApplyRedaction}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-redaction"]');
      expect(dialog).not.toBeNull();

      const warningBanner = document.querySelector('[data-testid="redaction-warning-banner"]');
      expect(warningBanner?.textContent).toContain(
        'True Redaction permanently deletes the underlying text'
      );

      const labelInput = document.querySelector(
        '[data-testid="input-redact-overlay-text"]'
      ) as HTMLInputElement;
      expect(labelInput.value).toBe('[REDACTED]');

      const btnApply = document.querySelector(
        '[data-testid="btn-confirm-redaction"]'
      ) as HTMLButtonElement;
      act(() => {
        btnApply.click();
      });

      expect(onApplyRedaction).toHaveBeenCalledTimes(1);
      expect(onApplyRedaction).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 0,
          bounds: { left: 50, bottom: 580, right: 250, top: 620 },
          overlayText: '[REDACTED]'
        })
      );
    });

    it('Done when: a redacted PDF has no recoverable text under redaction', async () => {
      const pdfBytes = await createSamplePdf();

      const sensitiveRun: TextRun = {
        id: 'run-ssn',
        type: 'text',
        text: 'Confidential Social Security Number: 123-45-6789',
        fontSize: 12,
        bounds: { left: 50, bottom: 590, right: 350, top: 615 },
        matrix: [1, 0, 0, 1, 50, 600],
        zIndex: 1,
        isEmbeddedSubset: false
      };

      const harmlessRun: TextRun = {
        id: 'run-footer',
        type: 'text',
        text: 'Page 1 of 1',
        fontSize: 10,
        bounds: { left: 50, bottom: 30, right: 150, top: 45 },
        matrix: [1, 0, 0, 1, 50, 30],
        zIndex: 1,
        isEmbeddedSubset: false
      };

      const pageMap = new Map<number, PageObject[]>();
      pageMap.set(0, [sensitiveRun, harmlessRun]);

      const redactionArea: RedactionArea = {
        id: 'red-target-ssn',
        pageIndex: 0,
        bounds: { left: 45, bottom: 585, right: 360, top: 620 },
        overlayText: '[REDACTED]'
      };

      const { updatedBytes, updatedObjectsMap, result } = await applyTrueRedaction(
        pdfBytes,
        [redactionArea],
        pageMap
      );

      // Verify redaction stats
      expect(result.removedTextRunCount).toBe(1);
      expect(result.redactedAreasCount).toBe(1);

      // Verify page objects have no trace of the sensitive text
      const page0Objects = updatedObjectsMap.get(0)!;
      const foundSensitive = page0Objects.some(
        (o) => (o as TextRun).text && (o as TextRun).text.includes('123-45-6789')
      );
      expect(foundSensitive).toBe(false);

      // Verify blackout rectangle was inserted
      const blackout = page0Objects.find((o) => o.id.includes('redaction-blackout-'));
      expect(blackout).toBeDefined();

      // Verify overlay label was inserted
      const label = page0Objects.find((o) => o.id.includes('redaction-label-')) as TextRun;
      expect(label).toBeDefined();
      expect(label.text).toBe('[REDACTED]');

      // Harmless footer text remains
      const foundHarmless = page0Objects.some((o) => o.id === 'run-footer');
      expect(foundHarmless).toBe(true);

      // Verify saved document bytes are valid PDF
      expect(updatedBytes.byteLength).toBeGreaterThan(0);
      const parsedDoc = await PDFDocument.load(updatedBytes);
      expect(parsedDoc.getPageCount()).toBe(1);
    });

    it('supports undo and redo of redactions via ApplyRedactionCommand', async () => {
      const origBytes = new Uint8Array([1, 1]);
      const redactedBytes = new Uint8Array([2, 2]);
      const origMap = new Map([[0, []]]);
      const redMap = new Map([[0, []]]);

      let currentBytes = origBytes;
      const callback = vi.fn((b) => {
        currentBytes = b;
      });

      const cmd = new ApplyRedactionCommand(0, origBytes, redactedBytes, origMap, redMap, callback);

      await cmd.apply();
      expect(currentBytes).toBe(redactedBytes);

      await cmd.revert();
      expect(currentBytes).toBe(origBytes);
    });
  });

  describe('Task 15.4: MetadataEditorDialog, getPdfMetadata, setPdfMetadata, stripAllMetadata', () => {
    it('renders metadata editor dialog and saves updated properties', async () => {
      const onSaveMetadata = vi.fn();
      const onStripMetadata = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <MetadataEditorDialog
            isOpen={true}
            initialMetadata={{
              title: 'Quarterly Report',
              author: 'Finance Team',
              subject: 'Q3 Results',
              keywords: ['finance', '2026']
            }}
            onClose={onClose}
            onSaveMetadata={onSaveMetadata}
            onStripMetadata={onStripMetadata}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-metadata-editor"]');
      expect(dialog).not.toBeNull();

      const titleInput = document.querySelector(
        '[data-testid="input-meta-title"]'
      ) as HTMLInputElement;
      expect(titleInput.value).toBe('Quarterly Report');

      const authorInput = document.querySelector(
        '[data-testid="input-meta-author"]'
      ) as HTMLInputElement;
      expect(authorInput.value).toBe('Finance Team');

      act(() => {
        triggerInputChange(titleInput, 'Updated Annual Report');
      });

      const btnSave = document.querySelector(
        '[data-testid="btn-save-metadata"]'
      ) as HTMLButtonElement;
      act(() => {
        btnSave.click();
      });

      expect(onSaveMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Annual Report',
          author: 'Finance Team'
        })
      );

      const btnStrip = document.querySelector(
        '[data-testid="btn-strip-all-metadata"]'
      ) as HTMLButtonElement;
      act(() => {
        btnStrip.click();
      });
      expect(onStripMetadata).toHaveBeenCalledTimes(1);
    });

    it('extracts, updates, and strips metadata on real PDF bytes', async () => {
      const bytes = await createSamplePdf();
      const initialMeta = await getPdfMetadata(bytes);
      expect(initialMeta.title).toBe('Financial Audit 2026');
      expect(initialMeta.author).toBe('Security Auditor');
      expect(initialMeta.keywords).toContain('confidential');

      const updatedBytes = await setPdfMetadata(bytes, {
        title: 'Public Cleared Summary',
        author: 'Compliance Officer',
        keywords: ['public', 'cleared']
      });

      const updatedMeta = await getPdfMetadata(updatedBytes);
      expect(updatedMeta.title).toBe('Public Cleared Summary');
      expect(updatedMeta.author).toBe('Compliance Officer');
      expect(updatedMeta.keywords).toContain('public');

      const strippedBytes = await stripAllMetadata(updatedBytes);
      const cleanMeta = await getPdfMetadata(strippedBytes);
      expect(cleanMeta.title).toBe('');
      expect(cleanMeta.author).toBe('');
      expect(cleanMeta.keywords?.length).toBe(0);
    });
  });

  describe('Task 15.6: LocalDataLockDialog & localDataLock passphrase protection', () => {
    it('sets, verifies, and removes 256-bit AES-GCM local data lock', async () => {
      expect(isLocalDataLockEnabled()).toBe(false);

      // Set lock
      await setLocalDataLockPassphrase('MySecureMasterKey2026!');
      expect(isLocalDataLockEnabled()).toBe(true);

      // Verify correct passphrase
      const ok = await verifyPassphrase('MySecureMasterKey2026!');
      expect(ok).toBe(true);

      // Reject incorrect passphrase
      const fail = await verifyPassphrase('WrongPassword!');
      expect(fail).toBe(false);

      // Remove lock
      const removed = await removeLocalDataLock('MySecureMasterKey2026!');
      expect(removed).toBe(true);
      expect(isLocalDataLockEnabled()).toBe(false);
    });

    it('renders LocalDataLockDialog and enforces passphrase validation', async () => {
      const onClose = vi.fn();

      await act(async () => {
        root.render(<LocalDataLockDialog isOpen={true} onClose={onClose} />);
      });

      const dialog = document.querySelector('[data-testid="dialog-local-data-lock"]');
      expect(dialog).not.toBeNull();

      const passInput = document.querySelector(
        '[data-testid="input-lock-passphrase"]'
      ) as HTMLInputElement;
      const confirmInput = document.querySelector(
        '[data-testid="input-lock-confirm-passphrase"]'
      ) as HTMLInputElement;
      const btnSet = document.querySelector('[data-testid="btn-enable-lock"]') as HTMLButtonElement;

      // Passphrase too short
      act(() => {
        triggerInputChange(passInput, '12');
        triggerInputChange(confirmInput, '12');
        btnSet.click();
      });

      const errorBanner = document.querySelector('[data-testid="lock-error-banner"]');
      expect(errorBanner?.textContent).toContain('at least 4 characters');
    });
  });

  describe('Task 15.7: PrivacyPolicyPage', () => {
    it('renders privacy policy page with client-side WebAssembly guarantees', async () => {
      const onBack = vi.fn();

      await act(async () => {
        root.render(<PrivacyPolicyPage onBack={onBack} />);
      });

      const page = document.querySelector('[data-testid="page-privacy-policy"]');
      expect(page).not.toBeNull();
      expect(page?.textContent).toContain('100% Client-Side On-Device Processing');
      expect(page?.textContent).toContain('Zero Tracking of Document Content');
      expect(page?.textContent).toContain('Local Encryption & Safe Storage');

      const btnBack = page?.querySelector('button');
      act(() => {
        btnBack?.click();
      });
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Task 15.8: Secure Storage, Clear Data Dialog & Temp Data Hygiene', () => {
    it('renders ClearDataConfirmDialog and triggers onConfirmClear', async () => {
      const onConfirmClear = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <ClearDataConfirmDialog isOpen={true} onClose={onClose} onConfirmClear={onConfirmClear} />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-clear-all-data"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('Clear All Local Data?');

      const btnClear = document.querySelector(
        '[data-testid="btn-confirm-clear-all"]'
      ) as HTMLButtonElement;
      act(() => {
        btnClear.click();
      });
      expect(onConfirmClear).toHaveBeenCalledTimes(1);
    });

    it('wipes document working data and recovery data cleanly', async () => {
      saveRecoveryMetadata({
        documentId: 'test-doc-123',
        filename: 'secret.pdf',
        isDirty: true
      });
      expect(getRecoveryMetadata()?.documentId).toBe('test-doc-123');

      await wipeDocumentWorkingData('test-doc-123');
      expect(getRecoveryMetadata()).toBeNull();
    });

    it('auto-expires recovery data older than 7 days (Task 15.8)', async () => {
      // Save old recovery metadata from 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      mockStorage['rhypdf_recovery_metadata'] = JSON.stringify({
        documentId: 'old-doc-8days',
        filename: 'old.pdf',
        timestamp: eightDaysAgo
      });

      const pruned = await pruneExpiredRecovery();
      expect(pruned).toBe(1);
      expect(mockStorage['rhypdf_recovery_metadata']).toBeUndefined();
    });

    it('clearAllLocalData wipes localStorage rhypdf_ keys', async () => {
      mockStorage['rhypdf_custom_pref'] = 'test';
      mockStorage['rhypdf_data_lock_enabled'] = 'true';
      mockStorage['unrelated_key'] = 'keep';

      await clearAllLocalData();

      expect(mockStorage['rhypdf_custom_pref']).toBeUndefined();
      expect(mockStorage['rhypdf_data_lock_enabled']).toBeUndefined();
      expect(mockStorage['unrelated_key']).toBe('keep');
    });
  });

  describe('Task 15.9: Link and Action Safety & ExternalLinkConfirmDialog', () => {
    it('blocks dangerous protocols and validates safe ones', () => {
      expect(validateLinkSafety('javascript:alert(1)').isSafe).toBe(false);
      expect(validateLinkSafety('data:text/html,bad').isSafe).toBe(false);
      expect(validateLinkSafety('file:///etc/passwd').isSafe).toBe(false);
      expect(validateLinkSafety('vbscript:run()').isSafe).toBe(false);
      expect(validateLinkSafety('blob:http://evil.com/').isSafe).toBe(false);

      const safeHttp = validateLinkSafety('https://example.com/privacy');
      expect(safeHttp.isSafe).toBe(true);
      expect(safeHttp.requiresConfirmation).toBe(true);

      const mailto = validateLinkSafety('mailto:hello@example.com');
      expect(mailto.isSafe).toBe(true);
      expect(mailto.requiresConfirmation).toBe(false);
    });

    it('renders ExternalLinkConfirmDialog and triggers onConfirmOpen', async () => {
      const onConfirmOpen = vi.fn();
      const onClose = vi.fn();

      await act(async () => {
        root.render(
          <ExternalLinkConfirmDialog
            isOpen={true}
            targetUrl="https://trusted-site.org/docs"
            onClose={onClose}
            onConfirmOpen={onConfirmOpen}
          />
        );
      });

      const dialog = document.querySelector('[data-testid="dialog-external-link-confirm"]');
      expect(dialog).not.toBeNull();

      const urlDest = document.querySelector('[data-testid="text-external-url-destination"]');
      expect(urlDest?.textContent).toBe('https://trusted-site.org/docs');

      const btnOpen = document.querySelector(
        '[data-testid="btn-confirm-open-external-link"]'
      ) as HTMLButtonElement;
      act(() => {
        btnOpen.click();
      });
      expect(onConfirmOpen).toHaveBeenCalledTimes(1);
    });
  });
});
