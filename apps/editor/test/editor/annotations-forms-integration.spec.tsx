import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, Root } from 'react-dom/client';
import {
  StampsPopover,
  SignatureDialog,
  StickyNotePopup,
  CommentsPanel,
  AnnotationSummaryDialog
} from '../../src/features/annotations';
import {
  XfaWarningBanner,
  AcroFormOverlay,
  AutofillDialog,
  CreateFormFieldDialog
} from '../../src/features/forms';
import type { AnnotationObject } from '@rhypdf/pdf-model';
import type { AcroFormField } from '@rhypdf/edit-core';

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined)
  },
  configurable: true
});

function setInputValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, val: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  descriptor?.set?.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Phase 12 UI Integration: Annotations, Signatures, and Forms', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    // Clean up any remaining portal dialogs in body
    const portals = document.body.querySelectorAll('[data-testid$="-dialog"]');
    portals.forEach((p) => p.remove());
  });

  describe('Task 12.3: StampsPopover', () => {
    it('renders presets grid and triggers onSelectStamp when Approved stamp is clicked', async () => {
      const handleSelectStamp = vi.fn();
      const handleClose = vi.fn();

      await act(async () => {
        root.render(
          <StampsPopover
            isOpen={true}
            onClose={handleClose}
            onSelectStamp={handleSelectStamp}
          />
        );
      });

      const popover = container.querySelector('[data-testid="stamps-popover"]');
      expect(popover).not.toBeNull();

      const approvedBtn = container.querySelector('[data-testid="btn-stamp-approved"]') as HTMLButtonElement;
      expect(approvedBtn).not.toBeNull();

      await act(async () => {
        approvedBtn.click();
      });

      expect(handleSelectStamp).toHaveBeenCalledWith(
        expect.objectContaining({
          stampType: 'Approved',
          customText: 'APPROVED'
        })
      );
      expect(handleClose).toHaveBeenCalled();
    });

    it('switches to custom text tab and creates custom stamp', async () => {
      const handleSelectStamp = vi.fn();

      await act(async () => {
        root.render(
          <StampsPopover
            isOpen={true}
            onClose={vi.fn()}
            onSelectStamp={handleSelectStamp}
          />
        );
      });

      const customTab = container.querySelector('[data-testid="tab-stamp-custom"]') as HTMLButtonElement;
      await act(async () => {
        customTab.click();
      });

      const textInput = container.querySelector('[data-testid="input-custom-stamp-text"]') as HTMLInputElement;
      expect(textInput).not.toBeNull();

      await act(async () => {
        setInputValue(textInput, 'REVIEWED BY LEGAL');
      });

      const insertBtn = container.querySelector('[data-testid="btn-apply-custom-stamp"]') as HTMLButtonElement;
      await act(async () => {
        insertBtn.click();
      });

      expect(handleSelectStamp).toHaveBeenCalledWith(
        expect.objectContaining({
          stampType: 'CustomText'
        })
      );
    });
  });

  describe('Task 12.4: SignatureDialog', () => {
    it('renders tabs and creates typed signature with selected cursive font', async () => {
      const handleInsertSignature = vi.fn();

      await act(async () => {
        root.render(
          <SignatureDialog
            isOpen={true}
            onClose={vi.fn()}
            onInsertSignature={handleInsertSignature}
          />
        );
      });

      const typeTab = document.body.querySelector('[data-testid="tab-sig-type"]') as HTMLButtonElement;
      expect(typeTab).not.toBeNull();
      await act(async () => {
        typeTab.click();
      });

      const nameInput = document.body.querySelector('[data-testid="input-sig-typed-name"]') as HTMLInputElement;
      expect(nameInput).not.toBeNull();

      await act(async () => {
        setInputValue(nameInput, 'Alexander Hamilton');
      });

      const insertBtn = document.body.querySelector('[data-testid="btn-insert-signature"]') as HTMLButtonElement;
      expect(insertBtn).not.toBeNull();
      await act(async () => {
        insertBtn.click();
      });

      expect(handleInsertSignature).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'type',
          data: 'Alexander Hamilton'
        })
      );
    });
  });

  describe('Task 12.2: StickyNotePopup and CommentsPanel', () => {
    it('renders StickyNotePopup, allows editing comment text and triggers update', async () => {
      const handleUpdateContent = vi.fn();
      const mockAnnot: AnnotationObject = {
        id: 'note-1',
        type: 'annotation',
        subType: 'Text',
        contents: 'Initial review comment',
        author: 'Sarah Jenkins',
        bounds: { left: 100, bottom: 200, right: 124, top: 224 },
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: 100
      };

      await act(async () => {
        root.render(
          <StickyNotePopup
            annotation={mockAnnot}
            position={{ x: 100, y: 200 }}
            onUpdateContent={handleUpdateContent}
            onDelete={vi.fn()}
            onClose={vi.fn()}
          />
        );
      });

      const textEl = container.querySelector('[data-testid="text-sticky-note-content"]') as HTMLElement;
      expect(textEl.textContent).toContain('Initial review comment');

      // Click to edit
      await act(async () => {
        textEl.click();
      });

      const textarea = container.querySelector('[data-testid="textarea-sticky-note"]') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();

      await act(async () => {
        setInputValue(textarea, 'Updated legal review comment');
      });

      const saveBtn = container.querySelector('[data-testid="btn-save-sticky-note"]') as HTMLButtonElement;
      await act(async () => {
        saveBtn.click();
      });

      expect(handleUpdateContent).toHaveBeenCalledWith('note-1', 'Updated legal review comment');
    });

    it('renders CommentsPanel with document notes and triggers jump to page', async () => {
      const handleJump = vi.fn();
      const mockAnnot: AnnotationObject = {
        id: 'note-2',
        type: 'annotation',
        subType: 'Text',
        contents: 'Clause 4 requires revision',
        author: 'Lead Counsel',
        bounds: { left: 50, bottom: 50, right: 74, top: 74 },
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: 100
      };

      const map = new Map<number, AnnotationObject[]>();
      map.set(2, [mockAnnot]);

      await act(async () => {
        root.render(
          <CommentsPanel
            isOpen={true}
            onClose={vi.fn()}
            annotationsByPage={map}
            onJumpToPage={handleJump}
          />
        );
      });

      const item = container.querySelector('[data-testid="comment-item-note-2"]') as HTMLElement;
      expect(item).not.toBeNull();
      expect(item.textContent).toContain('Clause 4 requires revision');
      expect(item.textContent).toContain('Page 3');

      await act(async () => {
        item.click();
      });

      expect(handleJump).toHaveBeenCalledWith(2);
    });
  });

  describe('Task 12.6: XfaWarningBanner', () => {
    it('renders XFA unsupported message and triggers dismiss callback', async () => {
      const handleDismiss = vi.fn();

      await act(async () => {
        root.render(<XfaWarningBanner onDismiss={handleDismiss} />);
      });

      const banner = container.querySelector('[data-testid="xfa-warning-banner"]');
      expect(banner).not.toBeNull();
      expect(banner?.textContent).toContain('XFA forms are not supported');

      const dismissBtn = container.querySelector('[data-testid="btn-dismiss-xfa-warning"]') as HTMLButtonElement;
      await act(async () => {
        dismissBtn.click();
      });

      expect(handleDismiss).toHaveBeenCalled();
    });
  });

  describe('Task 12.7: AcroFormOverlay', () => {
    it('renders interactive text input and checkbox with tab navigation', async () => {
      const handleFieldChange = vi.fn();
      const fields: AcroFormField[] = [
        {
          id: 'field-name',
          pageIndex: 0,
          bounds: { left: 50, bottom: 600, right: 250, top: 625 },
          type: 'text',
          name: 'FullName',
          value: 'John Public',
          tabOrder: 1
        },
        {
          id: 'field-check',
          pageIndex: 0,
          bounds: { left: 50, bottom: 550, right: 70, top: 570 },
          type: 'checkbox',
          name: 'AgreeTerms',
          value: false,
          tabOrder: 2
        }
      ];

      await act(async () => {
        root.render(
          <AcroFormOverlay
            pageWidthPt={612}
            pageHeightPt={792}
            fields={fields}
            onFieldValueChange={handleFieldChange}
          />
        );
      });

      const input = container.querySelector('[data-testid="form-input-FullName"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value).toBe('John Public');
      expect(input.tabIndex).toBe(1);

      await act(async () => {
        setInputValue(input, 'John Q. Public');
      });

      expect(handleFieldChange).toHaveBeenCalledWith('field-name', 'John Q. Public');

      const checkbox = container.querySelector('[data-testid="form-checkbox-AgreeTerms"]') as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.checked).toBe(false);

      await act(async () => {
        checkbox.click();
      });

      expect(handleFieldChange).toHaveBeenCalledWith('field-check', true);
    });
  });

  describe('Task 12.7: AutofillDialog', () => {
    it('renders autofill profile fields and applies autofill callback', async () => {
      const handleAutofill = vi.fn();

      await act(async () => {
        root.render(
          <AutofillDialog
            isOpen={true}
            onClose={vi.fn()}
            onApplyAutofill={handleAutofill}
          />
        );
      });

      const nameInput = document.body.querySelector('[data-testid="input-autofill-fullname"]') as HTMLInputElement;
      expect(nameInput).not.toBeNull();

      await act(async () => {
        setInputValue(nameInput, 'Martha Washington');
      });

      const applyBtn = document.body.querySelector('[data-testid="btn-apply-autofill"]') as HTMLButtonElement;
      expect(applyBtn).not.toBeNull();
      await act(async () => {
        applyBtn.click();
      });

      expect(handleAutofill).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Martha Washington'
        })
      );
    });
  });

  describe('Task 12.9: CreateFormFieldDialog', () => {
    it('creates new dropdown form field with name and options', async () => {
      const handleCreateField = vi.fn();

      await act(async () => {
        root.render(
          <CreateFormFieldDialog
            isOpen={true}
            onClose={vi.fn()}
            pageIndex={0}
            onCreateField={handleCreateField}
          />
        );
      });

      const typeSelect = document.body.querySelector('[data-testid="select-create-field-type"]') as HTMLSelectElement;
      expect(typeSelect).not.toBeNull();
      await act(async () => {
        setInputValue(typeSelect, 'dropdown');
      });

      const nameInput = document.body.querySelector('[data-testid="input-create-field-name"]') as HTMLInputElement;
      expect(nameInput).not.toBeNull();
      await act(async () => {
        setInputValue(nameInput, 'state_code');
      });

      const submitBtn = document.body.querySelector('[data-testid="btn-submit-create-field"]') as HTMLButtonElement;
      expect(submitBtn).not.toBeNull();
      await act(async () => {
        submitBtn.click();
      });

      expect(handleCreateField).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dropdown',
          name: 'state_code'
        })
      );
    });
  });

  describe('Task 12.10: AnnotationSummaryDialog', () => {
    it('previews markdown summary and handles copy to clipboard', async () => {
      const annot: AnnotationObject = {
        id: 'test-summary-annot',
        type: 'annotation',
        subType: 'Highlight',
        contents: 'Critical clause',
        customText: 'Standard termination clause',
        author: 'Lead Auditor',
        bounds: { left: 50, bottom: 100, right: 200, top: 120 },
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: 10
      };

      const map = new Map<number, AnnotationObject[]>();
      map.set(0, [annot]);

      await act(async () => {
        root.render(
          <AnnotationSummaryDialog
            isOpen={true}
            onClose={vi.fn()}
            annotationsByPage={map}
            documentName="contract"
          />
        );
      });

      const textarea = document.body.querySelector('[data-testid="textarea-summary-preview"]') as HTMLTextAreaElement;
      expect(textarea).not.toBeNull();
      expect(textarea.value).toContain('Document Annotation Summary');
      expect(textarea.value).toContain('Standard termination clause');

      const copyBtn = document.body.querySelector('[data-testid="btn-copy-summary"]') as HTMLButtonElement;
      expect(copyBtn).not.toBeNull();
      await act(async () => {
        copyBtn.click();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Standard termination clause')
      );
    });
  });
});
