import { describe, it, expect } from 'vitest';
import {
  createMarkupAnnotation,
  computeQuadPointsFromBounds,
  computeMultiLineQuadPoints,
  markupToVectorPaths,
  createStickyNote,
  stickyNoteToPageObjects,
  createStampAnnotation,
  stampToPageObjects,
  STAMP_PRESETS,
  generateAnnotationSummary,
  flattenAnnotations,
  AddAnnotationCommand,
  UpdateAnnotationCommand,
  DeleteAnnotationCommand,
  deriveKeyFromPassphrase,
  encryptSignaturePayload,
  decryptSignaturePayload,
  saveStoredSignature,
  loadStoredSignatures,
  deleteStoredSignature,
  createInitialsAnnotation,
  createDateStampAnnotation,
  InsertSignatureCommand,
  detectXfaForm,
  detectFormFieldsFromAnnotations,
  XFA_UNSUPPORTED_MESSAGE,
  matchFieldToProfile,
  autofillFormFields,
  saveAutofillProfile,
  loadAutofillProfile,
  flattenFormFields,
  SetFormFieldValueCommand,
  CreateFormFieldCommand,
  DeleteFormFieldCommand
} from '../src';
import type { AnnotationObject } from '@rhypdf/pdf-model';
import type { AcroFormField } from '../src/forms/types';

describe('Phase 12: Annotations, Signatures, and Forms', () => {
  describe('Task 12.1: Text-markup annotations (Highlight, Underline, StrikeOut, Squiggly)', () => {
    it('computes exact 8-point QuadPoints for bounding boxes per PDF §12.5.6.10', () => {
      const bounds = { left: 50, bottom: 100, right: 250, top: 120 };
      const quads = computeQuadPointsFromBounds(bounds);

      expect(quads).toHaveLength(8);
      // [x1, y1, x2, y2, x3, y3, x4, y4]
      // (top-left, top-right, bottom-left, bottom-right)
      expect(quads).toEqual([50, 120, 250, 120, 50, 100, 250, 100]);
    });

    it('computes concatenated multi-line QuadPoints', () => {
      const line1 = { left: 50, bottom: 200, right: 300, top: 220 };
      const line2 = { left: 50, bottom: 175, right: 250, top: 195 };
      const quads = computeMultiLineQuadPoints([line1, line2]);

      expect(quads).toHaveLength(16);
      expect(quads.slice(0, 8)).toEqual([50, 220, 300, 220, 50, 200, 300, 200]);
      expect(quads.slice(8, 16)).toEqual([50, 195, 250, 195, 50, 175, 250, 175]);
    });

    it('creates Highlight annotation with semi-transparent yellow default and quadpoints', () => {
      const bounds = { left: 60, bottom: 300, right: 200, top: 320 };
      const annot = createMarkupAnnotation({
        subType: 'Highlight',
        bounds,
        contents: 'Important note on this clause',
        text: 'Agreement between parties'
      });

      expect(annot.type).toBe('annotation');
      expect(annot.subType).toBe('Highlight');
      expect(annot.quadPoints).toEqual([60, 320, 200, 320, 60, 300, 200, 300]);
      expect(annot.color?.r).toBe(254);
      expect(annot.color?.g).toBe(240);
      expect(annot.opacity).toBe(0.5);
      expect(annot.contents).toBe('Important note on this clause');
    });

    it('converts Highlight into a filled semi-transparent polygon PathObject', () => {
      const annot = createMarkupAnnotation({
        subType: 'Highlight',
        bounds: { left: 50, bottom: 100, right: 150, top: 120 }
      });
      const paths = markupToVectorPaths(annot);

      expect(paths).toHaveLength(1);
      expect(paths[0]!.type).toBe('path');
      expect(paths[0]!.fill).toBe(true);
      expect(paths[0]!.fillMode).toBe('winding');
      expect(paths[0]!.segments[0]!.type).toBe('moveTo');
      expect(paths[0]!.segments[4]!.type).toBe('closePath');
    });

    it('converts Underline, StrikeOut, and Squiggly into vector strokes', () => {
      const underlineAnnot = createMarkupAnnotation({
        subType: 'Underline',
        bounds: { left: 50, bottom: 100, right: 150, top: 120 }
      });
      const underlinePaths = markupToVectorPaths(underlineAnnot);
      expect(underlinePaths[0]!.stroke).toBe(true);
      expect(underlinePaths[0]!.fill).toBe(false);

      const strikeAnnot = createMarkupAnnotation({
        subType: 'StrikeOut',
        bounds: { left: 50, bottom: 100, right: 150, top: 120 }
      });
      const strikePaths = markupToVectorPaths(strikeAnnot);
      expect(strikePaths[0]!.stroke).toBe(true);
      expect(strikePaths[0]!.bounds.bottom).toBe(110 - 1); // midpoint

      const squigglyAnnot = createMarkupAnnotation({
        subType: 'Squiggly',
        bounds: { left: 50, bottom: 100, right: 150, top: 120 }
      });
      const squigglyPaths = markupToVectorPaths(squigglyAnnot);
      expect(squigglyPaths[0]!.stroke).toBe(true);
      expect(squigglyPaths[0]!.segments.length).toBeGreaterThanOrEqual(10); // wave points
    });
  });

  describe('Task 12.2: Sticky notes / comments', () => {
    it('creates sticky note annotation at specified coordinate with comment contents', () => {
      const note = createStickyNote({
        position: { x: 120, y: 450 },
        contents: 'Review this paragraph before signing',
        author: 'Alice Legal',
        icon: 'Comment'
      });

      expect(note.type).toBe('annotation');
      expect(note.subType).toBe('Text');
      expect(note.icon).toBe('Comment');
      expect(note.author).toBe('Alice Legal');
      expect(note.contents).toBe('Review this paragraph before signing');
      expect(note.bounds.left).toBe(120);
      expect(note.bounds.bottom).toBe(450);
      expect(note.bounds.right).toBe(144);
      expect(note.bounds.top).toBe(474);
    });

    it('converts sticky note into a speech bubble vector path for flattening', () => {
      const note = createStickyNote({
        position: { x: 100, y: 200 },
        contents: 'Test comment'
      });
      const objects = stickyNoteToPageObjects(note);

      expect(objects).toHaveLength(1);
      expect(objects[0]!.type).toBe('path');
      expect((objects[0] as { fill: boolean }).fill).toBe(true);
    });
  });

  describe('Task 12.3: Stamps (Approved, Draft, Confidential, etc.)', () => {
    it('creates standard rubber stamps with preset styles and double border', () => {
      const approvedStamp = createStampAnnotation({
        stampType: 'Approved',
        bounds: { left: 100, bottom: 600, right: 260, top: 660 }
      });

      expect(approvedStamp.subType).toBe('Stamp');
      expect(approvedStamp.customText).toBe('APPROVED');
      expect(approvedStamp.customColor?.g).toBe(163); // green

      const objects = stampToPageObjects(approvedStamp);
      expect(objects).toHaveLength(2); // border path + text run
      expect(objects[0]!.type).toBe('path');
      expect(objects[1]!.type).toBe('text');
      expect((objects[1] as { text: string }).text).toBe('APPROVED');
    });

    it('creates custom text stamp with user text and custom color', () => {
      const customStamp = createStampAnnotation({
        stampType: 'CustomText',
        customText: 'AUDITED & VERIFIED',
        customColor: { r: 124, g: 58, b: 237, a: 255 },
        bounds: { left: 50, bottom: 500, right: 300, top: 570 }
      });

      expect(customStamp.customText).toBe('AUDITED & VERIFIED');
      expect(customStamp.customColor?.r).toBe(124);

      const objects = stampToPageObjects(customStamp);
      expect((objects[1] as { text: string }).text).toBe('AUDITED & VERIFIED');
    });
  });

  describe('Task 12.4: Signatures & WebCrypto AES-GCM Encryption', () => {
    it('derives 256-bit AES-GCM key and performs encryption and decryption roundtrip', async () => {
      const passphrase = 'MySuperSecurePassphrase123!';
      const salt = new Uint8Array(16);
      globalThis.crypto.getRandomValues(salt);

      const key = await deriveKeyFromPassphrase(passphrase, salt);
      expect(key.algorithm.name).toBe('AES-GCM');

      const originalSvg = 'M 10 20 C 30 40 50 10 80 90';
      const encrypted = await encryptSignaturePayload(originalSvg, passphrase);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(originalSvg);

      const decrypted = await decryptSignaturePayload(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.salt,
        passphrase
      );
      expect(decrypted).toBe(originalSvg);
    });

    it('saves and loads encrypted signature records locally', async () => {
      const record = {
        id: 'sig-test-1',
        label: 'My Formal Signature',
        mode: 'draw' as const,
        data: 'M 0 0 L 100 100'
      };

      await saveStoredSignature(record, 'SecretPasscode!');
      const loaded = await loadStoredSignatures('SecretPasscode!');

      const found = loaded.find((s) => s.id === 'sig-test-1');
      expect(found).toBeDefined();
      expect(found?.label).toBe('My Formal Signature');
      expect(found?.data).toBe('M 0 0 L 100 100');

      await deleteStoredSignature('sig-test-1');
      const reloaded = await loadStoredSignatures('SecretPasscode!');
      expect(reloaded.find((s) => s.id === 'sig-test-1')).toBeUndefined();
    });

    it('inserts signature onto page with undo/redo via InsertSignatureCommand', () => {
      const list: AnnotationObject[] = [];
      const cmd = new InsertSignatureCommand(
        0,
        {
          mode: 'type',
          data: 'Jane H. Doe',
          bounds: { left: 100, bottom: 200, right: 280, top: 250 }
        },
        list
      );

      cmd.apply();
      expect(list).toHaveLength(1);
      expect(list[0]!.signatureType).toBe('type');
      expect(list[0]!.signerName).toBe('Jane H. Doe');

      cmd.revert();
      expect(list).toHaveLength(0);
    });
  });

  describe('Task 12.5: Initials & Date Quick-Insert', () => {
    it('creates Initials annotation object', () => {
      const initials = createInitialsAnnotation('JHD', { x: 150, y: 300 }, 'Jane Doe');
      expect(initials.subType).toBe('Signature');
      expect(initials.signerName).toBe('JHD');
      expect(initials.bounds.left).toBe(150);
      expect(initials.bounds.bottom).toBe(300);
    });

    it('creates Date stamp quick-insert annotation object', () => {
      const dateStamp = createDateStampAnnotation('2026-11-11', { x: 300, y: 300 });
      expect(dateStamp.subType).toBe('Stamp');
      expect(dateStamp.customText).toBe('2026-11-11');
      expect(dateStamp.bounds.left).toBe(300);
    });
  });

  describe('Task 12.6: AcroForm Detection & XFA Warning', () => {
    it('detects standard AcroForm fields from widget annotations and preserves tab order', () => {
      const widget1: AnnotationObject = {
        id: 'widget-name',
        type: 'annotation',
        subType: 'Widget',
        bounds: { left: 50, bottom: 400, right: 250, top: 425 },
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: 100,
        fieldType: 'text',
        fieldName: 'FullName',
        fieldValue: 'John Doe',
        tabOrder: 1,
        required: true
      };

      const widget2: AnnotationObject = {
        id: 'widget-agree',
        type: 'annotation',
        subType: 'Widget',
        bounds: { left: 50, bottom: 350, right: 70, top: 370 },
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: 100,
        fieldType: 'checkbox',
        fieldName: 'AgreeTerms',
        fieldValue: false,
        tabOrder: 2
      };

      const fields = detectFormFieldsFromAnnotations([widget2, widget1], 0);
      expect(fields).toHaveLength(2);
      expect(fields[0]!.name).toBe('FullName');
      expect(fields[0]!.tabOrder).toBe(1);
      expect(fields[1]!.name).toBe('AgreeTerms');
      expect(fields[1]!.tabOrder).toBe(2);
    });

    it('detects dynamic XFA forms and returns the required unsupported notice', () => {
      const normalPdfText = '%PDF-1.7 ... /AcroForm << /Fields [ 10 0 R ] >> ...';
      expect(detectXfaForm(normalPdfText).hasXfa).toBe(false);

      const xfaPdfText = '%PDF-1.7 ... /AcroForm << /XFA [ 12 0 R 13 0 R ] >> ...';
      const xfaResult = detectXfaForm(xfaPdfText);
      expect(xfaResult.hasXfa).toBe(true);
      expect(xfaResult.warning).toBe(XFA_UNSUPPORTED_MESSAGE);
    });
  });

  describe('Task 12.7: Form Filling & Autofill Profile', () => {
    it('matches form field names against profile attributes using semantic heuristics', () => {
      const profile = {
        fullName: 'Jane Alice Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+1 555-0199',
        streetAddress: '123 Market St Suite 400',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'USA',
        company: 'Acme Corp',
        jobTitle: 'Senior Legal Officer',
        date: '2026-11-11'
      };

      expect(matchFieldToProfile('legal_full_name', profile)).toBe('Jane Alice Doe');
      expect(matchFieldToProfile('applicant_email', profile)).toBe('jane.doe@example.com');
      expect(matchFieldToProfile('Phone_Number', profile)).toBe('+1 555-0199');
      expect(matchFieldToProfile('Street_Addr', profile)).toBe('123 Market St Suite 400');
      expect(matchFieldToProfile('zipcode', profile)).toBe('94105');
      expect(matchFieldToProfile('company_name', profile)).toBe('Acme Corp');
    });

    it('autofills matching fields across page', () => {
      const fields: AcroFormField[] = [
        {
          id: 'f-1',
          pageIndex: 0,
          bounds: { left: 10, bottom: 10, right: 100, top: 30 },
          type: 'text',
          name: 'Full_Name',
          value: ''
        },
        {
          id: 'f-2',
          pageIndex: 0,
          bounds: { left: 10, bottom: 40, right: 100, top: 60 },
          type: 'text',
          name: 'EmailAddress',
          value: ''
        }
      ];

      const profile = {
        fullName: 'Robert Smith',
        firstName: 'Robert',
        lastName: 'Smith',
        email: 'robert@smith.org',
        phone: '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        company: '',
        jobTitle: '',
        date: ''
      };

      const filled = autofillFormFields(fields, profile);
      expect(filled.get('f-1')).toBe('Robert Smith');
      expect(filled.get('f-2')).toBe('robert@smith.org');
    });

    it('persists autofill profile in local storage', async () => {
      const testProfile = {
        fullName: 'Local User',
        firstName: 'Local',
        lastName: 'User',
        email: 'local@rhypdf.test',
        phone: '123',
        streetAddress: 'Main St',
        city: 'City',
        state: 'ST',
        postalCode: '10001',
        country: 'US',
        company: 'Org',
        jobTitle: 'Dev',
        date: '2026-11-11'
      };

      await saveAutofillProfile(testProfile);
      const loaded = await loadAutofillProfile();
      expect(loaded.email).toBe('local@rhypdf.test');
    });
  });

  describe('Task 12.8: Flatten Annotations & Form Fields', () => {
    it('flattens markup, sticky note, and stamp annotations into permanent static page objects', () => {
      const highlight = createMarkupAnnotation({
        subType: 'Highlight',
        bounds: { left: 50, bottom: 100, right: 150, top: 120 }
      });
      const note = createStickyNote({
        position: { x: 200, y: 300 },
        contents: 'Note test'
      });
      const stamp = createStampAnnotation({
        stampType: 'Approved',
        bounds: { left: 300, bottom: 400, right: 460, top: 460 }
      });

      const flattened = flattenAnnotations([highlight, note, stamp]);
      expect(flattened.length).toBeGreaterThanOrEqual(4);
      expect(flattened.some((o) => o.type === 'path')).toBe(true);
      expect(flattened.some((o) => o.type === 'text')).toBe(true);
    });

    it('flattens form fields into static text runs and checkmark vector paths', () => {
      const fields: AcroFormField[] = [
        {
          id: 'field-1',
          pageIndex: 0,
          bounds: { left: 50, bottom: 500, right: 250, top: 525 },
          type: 'text',
          name: 'FullName',
          value: 'Jane Doe'
        },
        {
          id: 'field-2',
          pageIndex: 0,
          bounds: { left: 50, bottom: 450, right: 75, top: 475 },
          type: 'checkbox',
          name: 'Agree',
          value: true
        }
      ];

      const flattened = flattenFormFields(fields);
      expect(flattened).toHaveLength(2);
      expect(flattened[0]!.type).toBe('text');
      expect((flattened[0] as { text: string }).text).toBe('Jane Doe');
      expect(flattened[1]!.type).toBe('path'); // vector checkmark
    });
  });

  describe('Task 12.9: Create Form Fields (text, checkbox, dropdown)', () => {
    it('creates new form field with undo/redo via CreateFormFieldCommand', () => {
      const fields: AcroFormField[] = [];
      const cmd = new CreateFormFieldCommand(
        0,
        {
          pageIndex: 0,
          type: 'dropdown',
          name: 'country_select',
          bounds: { left: 100, bottom: 200, right: 300, top: 230 },
          options: [
            { label: 'United States', value: 'US' },
            { label: 'Canada', value: 'CA' },
            { label: 'United Kingdom', value: 'UK' }
          ],
          defaultValue: 'US',
          required: true
        },
        fields
      );

      cmd.apply();
      expect(fields).toHaveLength(1);
      expect(fields[0]!.type).toBe('dropdown');
      expect(fields[0]!.name).toBe('country_select');
      expect(fields[0]!.options).toHaveLength(3);
      expect(fields[0]!.required).toBe(true);

      cmd.revert();
      expect(fields).toHaveLength(0);
    });

    it('updates form field value with undo/redo via SetFormFieldValueCommand', () => {
      const fields: AcroFormField[] = [
        {
          id: 'field-name',
          pageIndex: 0,
          bounds: { left: 50, bottom: 400, right: 200, top: 430 },
          type: 'text',
          name: 'username',
          value: 'initial'
        }
      ];

      const cmd = new SetFormFieldValueCommand(0, 'field-name', 'updated_username', fields);
      cmd.apply();
      expect(fields[0]!.value).toBe('updated_username');

      cmd.revert();
      expect(fields[0]!.value).toBe('initial');
    });
  });

  describe('Task 12.10: Annotation Summary Export', () => {
    it('generates structured Markdown, PlainText, and JSON reports', () => {
      const highlight = createMarkupAnnotation({
        subType: 'Highlight',
        bounds: { left: 50, bottom: 100, right: 200, top: 120 },
        contents: 'Crucial requirement',
        text: 'This agreement shall terminate upon 30 days notice',
        author: 'Attorney Sarah'
      });

      const note = createStickyNote({
        position: { x: 300, y: 500 },
        contents: 'Verify payment terms with finance',
        author: 'Finance Director'
      });

      const map = new Map<number, AnnotationObject[]>();
      map.set(0, [highlight]);
      map.set(1, [note]);

      // 1. Markdown
      const mdReport = generateAnnotationSummary(map, 'markdown');
      expect(mdReport.totalAnnotations).toBe(2);
      expect(mdReport.byType['Highlight']).toBe(1);
      expect(mdReport.byType['Text']).toBe(1);
      expect(mdReport.content).toContain('# Document Annotation Summary');
      expect(mdReport.content).toContain('## Page 1');
      expect(mdReport.content).toContain('This agreement shall terminate upon 30 days notice');
      expect(mdReport.content).toContain('## Page 2');
      expect(mdReport.content).toContain('Verify payment terms with finance');

      // 2. JSON
      const jsonReport = generateAnnotationSummary(map, 'json');
      const parsed = JSON.parse(jsonReport.content);
      expect(parsed.totalAnnotations).toBe(2);
      expect(parsed.items).toHaveLength(2);

      // 3. PlainText
      const textReport = generateAnnotationSummary(map, 'text');
      expect(textReport.content).toContain('DOCUMENT ANNOTATION SUMMARY');
      expect(textReport.content).toContain('PAGE 1');
      expect(textReport.content).toContain('PAGE 2');
    });
  });
});
