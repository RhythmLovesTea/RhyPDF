import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n } from '@rhypdf/i18n';
import type { TextRun, Rect } from '@rhypdf/pdf-model';
import { groupTextRunsToBlocks } from '@rhypdf/edit-core';
import { SelectionOverlay } from '../../src/features/editor/SelectionOverlay';
import { TextEditorOverlay } from '../../src/features/editor/TextEditorOverlay';
import { ContextualToolbar } from '../../src/features/editor/ContextualToolbar';
import { PropertiesPanel, SelectedObjectProps } from '../../src/features/editor/PropertiesPanel';
import { useDocStore } from '../../src/stores/docStore';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createMockTextRun(
  id: string,
  text: string,
  bounds: Rect,
  fontName = 'Helvetica',
  fontSize = 12,
  options?: Partial<TextRun>
): TextRun {
  return {
    id,
    type: 'text',
    text,
    fontName,
    fontSize,
    fillColor: { r: 0, g: 0, b: 0, a: 255 },
    bounds,
    matrix: [1, 0, 0, 1, bounds.left, bounds.bottom],
    zIndex: 1,
    isEmbeddedSubset: false,
    rotation: 0,
    ...options
  };
}

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

describe('Phase 7 UI: In-Place Text Editing, Overlays, and Controls', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      useDocStore.getState().setActiveMode('edit-text');
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('Task 7.5 & 7.17: SelectionOverlay in edit-text mode', () => {
    it('renders text block rectangles and handles hover and selection', () => {
      const r1 = createMockTextRun('r1', 'Sample paragraph line 1', {
        left: 50,
        bottom: 500,
        right: 250,
        top: 514
      });
      const blocks = groupTextRunsToBlocks([r1], 0);

      const onSelectBlock = vi.fn();
      const onDoubleClickBlock = vi.fn();

      act(() => {
        root.render(
          <SelectionOverlay
            pageWidthPt={600}
            pageHeightPt={800}
            pageObjects={[r1]}
            selectedIds={[]}
            activeMode="edit-text"
            textBlocks={blocks}
            onSelectBlock={onSelectBlock}
            onDoubleClickBlock={onDoubleClickBlock}
          />
        );
      });

      const blockRect = container.querySelector(`[data-testid="text-block-rect-${blocks[0]!.id}"]`);
      expect(blockRect).not.toBeNull();

      // Trigger click to select
      act(() => {
        blockRect!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      });
      expect(onSelectBlock).toHaveBeenCalledWith(blocks[0]!.id);

      // Trigger double-click to edit
      act(() => {
        blockRect!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      });
      expect(onDoubleClickBlock).toHaveBeenCalledWith(blocks[0]!.id);
    });

    it('displays OCR text hint badge when clicking non-editable raster image in edit-text mode (Task 7.5)', () => {
      const imgObj = {
        id: 'raster-img',
        type: 'image' as const,
        bounds: { left: 50, bottom: 200, right: 300, top: 400 },
        matrix: [1, 0, 0, 1, 50, 200] as [number, number, number, number, number, number],
        zIndex: 1,
        pixelWidth: 800,
        pixelHeight: 600,
        effectiveDpi: { x: 200, y: 200 }
      };

      const onOcrDetect = vi.fn();

      act(() => {
        root.render(
          <SelectionOverlay
            pageWidthPt={600}
            pageHeightPt={800}
            pageObjects={[imgObj]}
            selectedIds={[]}
            activeMode="edit-text"
            textBlocks={[]}
            onOcrDetectRequested={onOcrDetect}
          />
        );
      });

      // Click on raster image
      const nonEditRect = container.querySelector('rect[style*="not-allowed"]');
      expect(nonEditRect).not.toBeNull();

      act(() => {
        nonEditRect!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      });

      // OCR Hint badge appears
      const hintBadge = container.querySelector('[data-testid="ocr-hint-badge"]');
      expect(hintBadge).not.toBeNull();
      expect(hintBadge?.textContent).toContain('Text in scanned image cannot be edited directly');

      const ocrBtn = container.querySelector('[data-testid="btn-ocr-detect"]') as HTMLButtonElement;
      expect(ocrBtn).not.toBeNull();

      act(() => {
        ocrBtn.click();
      });
      expect(onOcrDetect).toHaveBeenCalled();
    });
  });

  describe('Task 7.7, 7.8, 7.9, 7.10, 7.12: TextEditorOverlay in-place typing surface', () => {
    it('renders inline text editor overlay positioned over block with typing surface', async () => {
      const r = createMockTextRun('r1', 'Editable text content', {
        left: 50,
        bottom: 500,
        right: 250,
        top: 520
      });
      const block = groupTextRunsToBlocks([r], 0)[0]!;

      const onCommit = vi.fn();
      const onCancel = vi.fn();

      act(() => {
        root.render(
          <TextEditorOverlay
            block={block}
            pageWidthPt={600}
            pageHeightPt={800}
            onCommit={onCommit}
            onCancel={onCancel}
          />
        );
      });

      const overlay = container.querySelector('[data-testid="text-editor-overlay"]');
      expect(overlay).not.toBeNull();

      const surface = container.querySelector(
        '[data-testid="inline-text-editor-surface"]'
      ) as HTMLTextAreaElement;
      expect(surface).not.toBeNull();
      expect(surface.value).toBe('Editable text content');
      expect(surface.getAttribute('dir')).toBe('auto');
      expect(surface.getAttribute('spellcheck')).toBe('true');

      // Type new text
      await act(async () => {
        setInputValue(surface, 'Updated paragraph text');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Commit button
      const commitBtn = container.querySelector(
        '[data-testid="btn-commit-edit"]'
      ) as HTMLButtonElement;
      expect(commitBtn).not.toBeNull();

      act(() => {
        commitBtn.click();
      });

      expect(onCommit).toHaveBeenCalledWith(
        block.id,
        ['Updated paragraph text'],
        expect.objectContaining({
          fontName: 'Helvetica',
          fontSize: 12
        })
      );
    });

    it('shows missing glyph warning notice when font is subset with missing characters (Task 7.12)', () => {
      const subsetRun = createMockTextRun(
        'sub1',
        'Only Latin',
        {
          left: 50,
          bottom: 500,
          right: 200,
          top: 514
        },
        'ABCDEF+SubsetFont',
        12,
        {
          isEmbeddedSubset: true,
          fontInfo: { isEmbedded: true, isSubset: true }
        }
      );

      const block = groupTextRunsToBlocks([subsetRun], 0)[0]!;
      // Simulate missing glyphs
      block.fontReusability = {
        canReuseFont: false,
        isSubset: true,
        isEmbedded: true,
        fontName: 'ABCDEF+SubsetFont',
        missingGlyphs: ['z', 'q'],
        recommendedFallback: 'Roboto'
      };

      act(() => {
        root.render(
          <TextEditorOverlay
            block={block}
            pageWidthPt={600}
            pageHeightPt={800}
            onCommit={vi.fn()}
            onCancel={vi.fn()}
          />
        );
      });

      const notice = container.querySelector('[data-testid="notice-missing-glyph"]');
      expect(notice).not.toBeNull();
      expect(notice?.textContent).toContain('Font changed to Roboto to keep all letters');
    });

    it('displays overflow indicator and handles grow box option (Task 7.10)', async () => {
      const r = createMockTextRun('r1', 'Small', {
        left: 50,
        bottom: 500,
        right: 120,
        top: 514 // height is 14pt
      });
      const block = groupTextRunsToBlocks([r], 0)[0]!;

      const onGrowDownward = vi.fn();

      act(() => {
        root.render(
          <TextEditorOverlay
            block={block}
            pageWidthPt={600}
            pageHeightPt={800}
            onCommit={vi.fn()}
            onCancel={vi.fn()}
            onGrowDownward={onGrowDownward}
            onShrinkToFit={vi.fn()}
          />
        );
      });

      const surface = container.querySelector(
        '[data-testid="inline-text-editor-surface"]'
      ) as HTMLTextAreaElement;

      // Enter large text that definitely overflows 14pt height
      await act(async () => {
        setInputValue(
          surface,
          'Paragraph line one.\nParagraph line two.\nParagraph line three.\nParagraph line four.'
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const overflowBar = container.querySelector('[data-testid="text-overflow-indicator"]');
      expect(overflowBar).not.toBeNull();

      const growBtn = container.querySelector(
        '[data-testid="btn-grow-downward"]'
      ) as HTMLButtonElement;
      expect(growBtn).not.toBeNull();

      await act(async () => {
        growBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(onGrowDownward).toHaveBeenCalled();
    });

    it('displays overflow indicator and handles shrink to fit option (Task 7.10)', async () => {
      const r = createMockTextRun('r1', 'Small', {
        left: 50,
        bottom: 500,
        right: 120,
        top: 514 // height is 14pt
      });
      const block = groupTextRunsToBlocks([r], 0)[0]!;

      const onShrinkToFit = vi.fn();

      act(() => {
        root.render(
          <TextEditorOverlay
            block={block}
            pageWidthPt={600}
            pageHeightPt={800}
            onCommit={vi.fn()}
            onCancel={vi.fn()}
            onGrowDownward={vi.fn()}
            onShrinkToFit={onShrinkToFit}
          />
        );
      });

      const surface = container.querySelector(
        '[data-testid="inline-text-editor-surface"]'
      ) as HTMLTextAreaElement;

      // Enter large text that definitely overflows 14pt height
      await act(async () => {
        setInputValue(
          surface,
          'Paragraph line one.\nParagraph line two.\nParagraph line three.\nParagraph line four.'
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const overflowBar = container.querySelector('[data-testid="text-overflow-indicator"]');
      expect(overflowBar).not.toBeNull();

      const shrinkBtn = container.querySelector(
        '[data-testid="btn-shrink-to-fit"]'
      ) as HTMLButtonElement;
      expect(shrinkBtn).not.toBeNull();

      await act(async () => {
        shrinkBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(onShrinkToFit).toHaveBeenCalled();
    });
  });

  describe('Task 7.13, 7.15, 7.18: ContextualToolbar and PropertiesPanel in edit-text mode', () => {
    it('renders Add Text, Select Region, and Find & Replace buttons in ContextualToolbar', () => {
      const onAddText = vi.fn();
      const onSelectRegion = vi.fn();
      const onToggleFindReplace = vi.fn();
      const onDeleteText = vi.fn();

      act(() => {
        root.render(
          <ContextualToolbar
            onAddText={onAddText}
            onSelectRegion={onSelectRegion}
            onToggleFindReplace={onToggleFindReplace}
            onDeleteText={onDeleteText}
            hasSelectedTextBlock={true}
          />
        );
      });

      const addBtn = container.querySelector('[data-testid="btn-add-text"]') as HTMLButtonElement;
      const regionBtn = container.querySelector(
        '[data-testid="btn-select-region"]'
      ) as HTMLButtonElement;
      const findBtn = container.querySelector(
        '[data-testid="btn-find-replace"]'
      ) as HTMLButtonElement;
      const delBtn = container.querySelector(
        '[data-testid="btn-delete-text"]'
      ) as HTMLButtonElement;

      expect(addBtn).not.toBeNull();
      expect(regionBtn).not.toBeNull();
      expect(findBtn).not.toBeNull();
      expect(delBtn).not.toBeNull();

      act(() => {
        addBtn.click();
      });
      expect(onAddText).toHaveBeenCalled();

      act(() => {
        regionBtn.click();
      });
      expect(onSelectRegion).toHaveBeenCalled();

      act(() => {
        findBtn.click();
      });
      expect(onToggleFindReplace).toHaveBeenCalled();

      act(() => {
        delBtn.click();
      });
      expect(onDeleteText).toHaveBeenCalled();
    });

    it('displays Typography section and font reusability status in PropertiesPanel', () => {
      const selectedTextObj: SelectedObjectProps = {
        id: 'block-test-1',
        type: 'text',
        x: 50,
        y: 500,
        width: 200,
        height: 30,
        rotation: 0,
        opacity: 100,
        textPreview: 'Sample text preview in properties panel',
        fontFamily: 'Liberation Sans',
        fontSize: 14,
        canReuseFont: true,
        isSubset: true
      };

      act(() => {
        root.render(
          <PropertiesPanel open={true} onToggle={vi.fn()} selectedObject={selectedTextObj} />
        );
      });

      const typographySection = container.querySelector(
        '[data-testid="text-block-properties-section"]'
      );
      expect(typographySection).not.toBeNull();

      const previewBox = container.querySelector('[data-testid="text-preview-box"]');
      expect(previewBox?.textContent).toContain('Sample text preview');

      const fontFam = container.querySelector('[data-testid="prop-font-family"]');
      expect(fontFam?.textContent).toBe('Liberation Sans');

      const fontSize = container.querySelector('[data-testid="prop-font-size"]');
      expect(fontSize?.textContent).toBe('14 pt');

      const statusBadge = container.querySelector('[data-testid="prop-font-status-badge"]');
      expect(statusBadge?.textContent).toBe('Embedded Subset');
    });
  });
});
