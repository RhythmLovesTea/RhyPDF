import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  ScannedPageBanner,
  OcrProgressModal,
  OcrReviewDialog,
  BatchOcrDialog
} from '../../src/features/ocr';
import type { OcrPageResult } from '@rhypdf/ocr';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, val: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  descriptor?.set?.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Phase 10 UI: OCR (Scanned PDFs and Images)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  // Task 10.1: ScannedPageBanner
  describe('Task 10.1: ScannedPageBanner component', () => {
    it('renders scanned page banner with page index and detection reason', () => {
      const handleStart = vi.fn();
      const handleDismiss = vi.fn();
      const handleSelectLang = vi.fn();

      act(() => {
        root.render(
          <ScannedPageBanner
            pageIndex={0}
            reason="Full-page scan image detected with zero text runs"
            selectedLanguage="eng"
            onSelectLanguage={handleSelectLang}
            onStartOcr={handleStart}
            onDismiss={handleDismiss}
          />
        );
      });

      expect(container.textContent).toContain('This page looks scanned');
      expect(container.textContent).toContain('Page 1');
      expect(container.textContent).toContain('Full-page scan image detected with zero text runs');

      // Click "Make Text Editable"
      const buttons = Array.from(container.querySelectorAll('button'));
      const btnEditable = buttons.find((b) => b.textContent?.includes('Make Text Editable'));
      expect(btnEditable).toBeTruthy();

      act(() => {
        btnEditable?.click();
      });
      expect(handleStart).toHaveBeenCalledWith('editable');

      // Click "Make Searchable"
      const btnSearchable = buttons.find((b) => b.textContent?.includes('Make Searchable'));
      expect(btnSearchable).toBeTruthy();
      act(() => {
        btnSearchable?.click();
      });
      expect(handleStart).toHaveBeenCalledWith('searchable');

      // Dismiss
      const btnDismiss = container.querySelector(
        'button[aria-label="Dismiss banner"]'
      ) as HTMLButtonElement;
      expect(btnDismiss).toBeTruthy();
      act(() => {
        btnDismiss?.click();
      });
      expect(handleDismiss).toHaveBeenCalled();
    });

    it('changes language selector in banner', () => {
      const handleSelectLang = vi.fn();
      act(() => {
        root.render(
          <ScannedPageBanner
            pageIndex={1}
            reason="Dominant image detected"
            selectedLanguage="eng"
            onSelectLanguage={handleSelectLang}
            onStartOcr={vi.fn()}
            onDismiss={vi.fn()}
          />
        );
      });

      const select = container.querySelector('#ocr-lang-select') as HTMLSelectElement;
      expect(select).toBeTruthy();
      act(() => {
        select.value = 'hin';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(handleSelectLang).toHaveBeenCalledWith('hin');
    });
  });

  // Task 10.2: OcrProgressModal
  describe('Task 10.2: OcrProgressModal component', () => {
    it('displays progress percentage and cancel button', () => {
      const handleCancel = vi.fn();
      act(() => {
        root.render(
          <OcrProgressModal
            isOpen={true}
            progress={{
              status: 'recognizing',
              progress: 0.65,
              message: 'Recognizing text with Tesseract.js...'
            }}
            onCancel={handleCancel}
          />
        );
      });

      expect(container.textContent).toContain('Optical Character Recognition');
      expect(container.textContent).toContain('Recognizing text with Tesseract.js...');
      expect(container.textContent).toContain('65%');

      const btnCancel = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Cancel OCR')
      );
      expect(btnCancel).toBeTruthy();
      act(() => {
        btnCancel?.click();
      });
      expect(handleCancel).toHaveBeenCalled();
    });
  });

  // Task 10.9 & 10.14: OcrReviewDialog
  describe('Task 10.9 & 10.14: OcrReviewDialog component', () => {
    const mockResult: OcrPageResult = {
      pageIndex: 0,
      fullText: 'Invoice #1001 for Services Rendered',
      meanConfidence: 62.0, // Low confidence
      blocks: [
        {
          id: 'b-0',
          text: 'Invoice #1001 for Services Rendered',
          confidence: 62.0,
          bbox: { left: 50, top: 50, right: 300, bottom: 80 },
          lines: []
        },
        {
          id: 'b-1',
          text: 'Total Amount: $500.00',
          confidence: 90.0,
          bbox: { left: 50, top: 90, right: 250, bottom: 120 },
          lines: []
        }
      ],
      durationMs: 250,
      language: 'eng',
      isHandwritingSuspected: true, // Task 10.14 handwriting flag
      imageWidth: 600,
      imageHeight: 800
    };

    it('renders review dialog with confidence badge, textarea, and handwriting notice', () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      act(() => {
        root.render(
          <OcrReviewDialog
            isOpen={true}
            result={mockResult}
            outputMode="editable"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        );
      });

      expect(container.textContent).toContain('Review OCR Text');
      expect(container.textContent).toContain('62% Confidence');

      // Task 10.14: Handwriting notice check
      expect(container.textContent).toContain('Handwritten content detected');

      // Check current block
      expect(container.textContent).toContain('Block 1 of 2');
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Invoice #1001 for Services Rendered');

      // Edit text
      act(() => {
        textarea.value = 'Invoice #1001 for Professional Services';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Click "Accept & Next"
      const buttons = Array.from(container.querySelectorAll('button'));
      const btnNext = buttons.find((b) => b.textContent?.includes('Accept & Next'));
      expect(btnNext).toBeTruthy();
      act(() => {
        btnNext?.click();
      });
      expect(container.textContent).toContain('Block 2 of 2');

      // Click "Apply to Document"
      const buttonsAfter = Array.from(container.querySelectorAll('button'));
      const btnApply = buttonsAfter.find((b) => b.textContent?.includes('Apply to Document'));
      expect(btnApply).toBeTruthy();
      act(() => {
        btnApply?.click();
      });
      expect(handleConfirm).toHaveBeenCalled();
    });
  });

  // Task 10.12: BatchOcrDialog
  describe('Task 10.12: BatchOcrDialog component', () => {
    it('configures page range, output format, and triggers batch OCR', () => {
      const handleStart = vi.fn();
      const handleClose = vi.fn();

      act(() => {
        root.render(
          <BatchOcrDialog
            isOpen={true}
            totalPages={5}
            currentPage={0}
            onStartBatch={handleStart}
            onClose={handleClose}
          />
        );
      });

      expect(container.textContent).toContain('Batch OCR Documents');
      expect(container.textContent).toContain('All Pages (5)');

      // Click "Run Batch OCR"
      const buttons = Array.from(container.querySelectorAll('button'));
      const btnRun = buttons.find((b) => b.textContent?.includes('Run Batch OCR'));
      expect(btnRun).toBeTruthy();

      act(() => {
        btnRun?.click();
      });

      expect(handleStart).toHaveBeenCalledWith({
        pageIndices: [0, 1, 2, 3, 4],
        language: 'eng',
        outputMode: 'searchable',
        downloadAfter: false
      });
    });

    it('supports custom page range and OCR & Download action', () => {
      const handleStart = vi.fn();
      act(() => {
        root.render(
          <BatchOcrDialog
            isOpen={true}
            totalPages={10}
            currentPage={2}
            onStartBatch={handleStart}
            onClose={vi.fn()}
          />
        );
      });

      // Select Custom Range
      const buttons = Array.from(container.querySelectorAll('button'));
      const btnCustom = buttons.find((b) => b.textContent?.includes('Custom Range'));
      expect(btnCustom).toBeTruthy();
      act(() => {
        btnCustom?.click();
      });

      const input = container.querySelector('input[type="text"]') as HTMLInputElement;
      expect(input).toBeTruthy();
      act(() => {
        setInputValue(input, '1-2, 5');
      });

      // Click "OCR & Download"
      const buttonsAfter = Array.from(container.querySelectorAll('button'));
      const btnDownload = buttonsAfter.find((b) => b.textContent?.includes('OCR & Download'));
      expect(btnDownload).toBeTruthy();
      act(() => {
        btnDownload?.click();
      });

      expect(handleStart).toHaveBeenCalledWith({
        pageIndices: [0, 1, 4],
        language: 'eng',
        outputMode: 'searchable',
        downloadAfter: true
      });
    });
  });
});
