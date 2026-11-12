/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import type { ImageObject, Rect } from '@rhypdf/pdf-model';
import type { TextBlock } from '@rhypdf/edit-core';
import { ContextualToolbar } from '../../src/features/editor/ContextualToolbar';
import { SelectionOverlay } from '../../src/features/editor/SelectionOverlay';
import { useDocStore } from '../../src/stores/docStore';
import { PdfViewer } from '../../src/features/viewer/PdfViewer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Multi-Page Synchronization, Text Selection, and Image Insertion', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderWithI18n = (ui: React.ReactElement) => {
    act(() => {
      root.render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
    });
  };

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  });

  describe('ContextualToolbar in edit-text mode', () => {
    beforeEach(() => {
      act(() => {
        useDocStore.getState().setActiveMode('edit-text');
      });
    });

    it('renders both Add Text and Add Image buttons in edit-text mode', () => {
      const onAddText = vi.fn();
      const onInsertImage = vi.fn();

      renderWithI18n(
        <ContextualToolbar
          onAddText={onAddText}
          onInsertImage={onInsertImage}
        />
      );

      const addTextBtn = container.querySelector('[data-testid="btn-add-text"]') as HTMLButtonElement | null;
      const addImageBtn = container.querySelector('[data-testid="btn-add-image"]') as HTMLButtonElement | null;

      expect(addTextBtn).not.toBeNull();
      expect(addImageBtn).not.toBeNull();

      act(() => {
        addTextBtn?.click();
      });
      expect(onAddText).toHaveBeenCalledTimes(1);

      act(() => {
        addImageBtn?.click();
      });
      expect(onInsertImage).toHaveBeenCalledTimes(1);
    });
  });

  describe('SelectionOverlay pointer events and layers', () => {
    const sampleBox: Rect = { left: 50, bottom: 100, right: 250, top: 150 };
    const sampleTextBlock: TextBlock = {
      id: 'block-1',
      pageIndex: 11,
      bounds: sampleBox,
      lines: [{ text: 'How to Use This Book', bounds: sampleBox, runs: [] }],
      runs: [
        {
          id: 'run-1',
          type: 'text',
          text: 'How to Use This Book',
          fontName: 'Roboto',
          fontSize: 14,
          fillColor: { r: 0, g: 0, b: 0, a: 255 },
          matrix: [1, 0, 0, 1, 50, 100],
          bounds: sampleBox
        }
      ],
      primaryFont: 'Roboto',
      primaryFontSize: 14,
      primaryColor: { r: 0, g: 0, b: 0, a: 255 }
    };

    it('sets pointerEvents to none in view mode when nothing is selected', () => {
      renderWithI18n(
        <SelectionOverlay
          pageWidthPt={600}
          pageHeightPt={800}
          pageObjects={[]}
          selectedIds={[]}
          activeMode="view"
        />
      );

      const svg = container.querySelector('[data-testid="selection-overlay"]') as SVGSVGElement | null;
      expect(svg).not.toBeNull();
      expect(svg?.style.pointerEvents).toBe('none');
    });

    it('sets pointerEvents to auto in edit-text mode and renders text block with click and double-click', () => {
      const onSelectBlock = vi.fn();
      const onDoubleClickBlock = vi.fn();

      renderWithI18n(
        <SelectionOverlay
          pageWidthPt={600}
          pageHeightPt={800}
          pageObjects={[]}
          selectedIds={[]}
          textBlocks={[sampleTextBlock]}
          activeMode="edit-text"
          onSelectBlock={onSelectBlock}
          onDoubleClickBlock={onDoubleClickBlock}
        />
      );

      const svg = container.querySelector('[data-testid="selection-overlay"]') as SVGSVGElement | null;
      expect(svg).not.toBeNull();
      expect(svg?.style.pointerEvents).toBe('auto');

      const blockRect = container.querySelector('[data-testid="text-block-rect-block-1"]') as SVGRectElement | null;
      expect(blockRect).not.toBeNull();

      act(() => {
        blockRect?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      expect(onSelectBlock).toHaveBeenCalledWith('block-1');

      act(() => {
        blockRect?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      });
      expect(onDoubleClickBlock).toHaveBeenCalledWith('block-1');
    });

    it('renders image hit-rect and preview in edit-images mode', () => {
      const onSelectIds = vi.fn();
      const sampleImage: ImageObject = {
        id: 'img-101',
        type: 'image',
        pixelWidth: 400,
        pixelHeight: 300,
        effectiveDpi: { x: 72, y: 72 },
        bounds: sampleBox,
        matrix: [1, 0, 0, 1, 50, 100],
        zIndex: 1,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };

      renderWithI18n(
        <SelectionOverlay
          pageWidthPt={600}
          pageHeightPt={800}
          pageObjects={[sampleImage]}
          selectedIds={[]}
          activeMode="edit-images"
          onSelectIds={onSelectIds}
        />
      );

      const imgPreview = container.querySelector('image[href^="data:image/png"]') as SVGImageElement | null;
      const hitRect = container.querySelector('[data-testid="image-object-img-101"]') as SVGRectElement | null;

      expect(imgPreview).not.toBeNull();
      expect(hitRect).not.toBeNull();

      act(() => {
        hitRect?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      expect(onSelectIds).toHaveBeenCalledWith(['img-101']);
    });
  });

  describe('PdfViewer page and scale synchronization', () => {
    it('notifies onPageChange and accepts currentPage prop', () => {
      const onPageChange = vi.fn();
      const onScaleChange = vi.fn();

      renderWithI18n(
        <PdfViewer
          docId="test-sync-doc"
          pageCount={300}
          currentPage={12}
          onPageChange={onPageChange}
          onScaleChange={onScaleChange}
        />
      );

      const topBar = container.querySelector('[data-testid="viewer-top-bar"]');
      expect(topBar).not.toBeNull();
      expect(onPageChange).toHaveBeenCalled();
    });
  });
});
