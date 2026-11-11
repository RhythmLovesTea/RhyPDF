import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  ShapesPopover,
  InsertTableDialog,
  HeaderFooterDialog,
  WatermarkDialog,
  LinkDialog,
  LinkChip,
  SpecialItemsPopover
} from '../../src/features/tools';
import { DrawingCanvasOverlay } from '../../src/features/editor/DrawingCanvasOverlay';
import { RulerGridOverlay } from '../../src/features/editor/RulerGridOverlay';

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

describe('Phase 11 UI Integration: Word-like Content Tools', () => {
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

  describe('Task 11.1 & 11.3: ShapesPopover & Whiteout Cover', () => {
    it('opens shape popover, selects star shape, and triggers insert', async () => {
      const handleInsert = vi.fn();
      await act(async () => {
        root.render(<ShapesPopover onInsertShape={handleInsert} pageWidthPt={612} pageHeightPt={792} />);
      });

      const menuBtn = container.querySelector('[data-testid="btn-shapes-menu"]') as HTMLButtonElement;
      expect(menuBtn).not.toBeNull();
      await act(async () => {
        menuBtn.click();
      });

      const popover = container.querySelector('[data-testid="popover-shapes"]');
      expect(popover).not.toBeNull();

      // Select star shape
      const starBtn = container.querySelector('[data-testid="shape-option-star"]') as HTMLButtonElement;
      expect(starBtn).not.toBeNull();
      await act(async () => {
        starBtn.click();
      });

      // Confirm insertion
      const confirmBtn = container.querySelector('[data-testid="btn-insert-shape-confirm"]') as HTMLButtonElement;
      await act(async () => {
        confirmBtn.click();
      });

      expect(handleInsert).toHaveBeenCalled();
      const inserted = handleInsert.mock.calls[0][0];
      expect(inserted.shapeType).toBe('star');
      expect(inserted.type).toBe('path');
    });

    it('inserts whiteout visual cover with safety disclaimer', async () => {
      const handleInsert = vi.fn();
      await act(async () => {
        root.render(<ShapesPopover onInsertShape={handleInsert} />);
      });

      const menuBtn = container.querySelector('[data-testid="btn-shapes-menu"]') as HTMLButtonElement;
      await act(async () => {
        menuBtn.click();
      });

      const whiteoutBtn = container.querySelector('[data-testid="btn-insert-whiteout"]') as HTMLButtonElement;
      await act(async () => {
        whiteoutBtn.click();
      });

      expect(handleInsert).toHaveBeenCalled();
      const cover = handleInsert.mock.calls[0][0];
      expect(cover.isWhiteout).toBe(true);
      expect(cover.shapeType).toBe('rectangle');
      expect(cover.fillColor).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    });
  });

  describe('Task 11.2: Free-hand Drawing Canvas Overlay', () => {
    it('records pointer events with pressure and commits smoothed stroke', async () => {
      const handleCommit = vi.fn();
      await act(async () => {
        root.render(
          <DrawingCanvasOverlay
            pageWidthPt={612}
            pageHeightPt={792}
            tool="pen"
            color="#2563eb"
            strokeWidth={3}
            onCommitStroke={handleCommit}
          />
        );
      });

      const canvas = container.querySelector('[data-testid="drawing-canvas-overlay"]') as HTMLCanvasElement;
      expect(canvas).not.toBeNull();

      await act(async () => {
        canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, pressure: 0.6 }));
        canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 140, clientY: 120, pressure: 0.8 }));
        canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 180, clientY: 150, pressure: 0.5 }));
        canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      });

      expect(handleCommit).toHaveBeenCalled();
      const stroke = handleCommit.mock.calls[0][0];
      expect(stroke.isDrawingStroke).toBe(true);
      expect(stroke.tool).toBe('pen');
      expect(stroke.segments.length).toBeGreaterThanOrEqual(2);
    });

    it('triggers erase callback when eraser tool hits stroke', async () => {
      const handleErase = vi.fn();
      const mockStroke = {
        id: 'stroke-test-1',
        type: 'path' as const,
        isDrawingStroke: true as const,
        tool: 'pen' as const,
        bounds: { left: 90, bottom: 600, right: 190, top: 710 },
        rawPoints: [{ x: 100, y: 692 }, { x: 180, y: 612 }],
        matrix: [1, 0, 0, 1, 0, 0] as const,
        zIndex: 50,
        lineWidth: 3,
        segments: []
      };

      await act(async () => {
        root.render(
          <DrawingCanvasOverlay
            pageWidthPt={612}
            pageHeightPt={792}
            tool="eraser"
            existingStrokes={[mockStroke]}
            onCommitStroke={vi.fn()}
            onEraseStroke={handleErase}
          />
        );
      });

      const canvas = container.querySelector('[data-testid="drawing-canvas-overlay"]') as HTMLCanvasElement;
      await act(async () => {
        canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 140, clientY: 140 }));
      });

      expect(handleErase).toHaveBeenCalledWith('stroke-test-1');
    });
  });

  describe('Task 11.4 & 11.5: Hyperlink Dialog & Link Chip', () => {
    it('validates URL input and blocks dangerous javascript: protocol', async () => {
      const handleSave = vi.fn();
      await act(async () => {
        root.render(<LinkDialog isOpen={true} onClose={vi.fn()} onSaveLink={handleSave} />);
      });

      const input = document.body.querySelector('[data-testid="input-link-destination"]') as HTMLInputElement;
      expect(input).not.toBeNull();

      await act(async () => {
        setInputValue(input, 'javascript:alert(1)');
      });

      const saveBtn = document.body.querySelector('[data-testid="btn-apply-link"]') as HTMLButtonElement;
      await act(async () => {
        saveBtn.click();
      });

      expect(handleSave).not.toHaveBeenCalled();
      const errorMsg = document.body.querySelector('[data-testid="link-error-msg"]');
      expect(errorMsg).not.toBeNull();
      expect(errorMsg?.textContent).toContain('not permitted');

      // Valid URL
      await act(async () => {
        setInputValue(input, 'https://rhypdf.app');
      });
      await act(async () => {
        saveBtn.click();
      });

      expect(handleSave).toHaveBeenCalledWith({
        target: { type: 'url', url: 'https://rhypdf.app/' }
      });
    });

    it('renders LinkChip with destination and handles edit/remove actions', async () => {
      const handleEdit = vi.fn();
      const handleRemove = vi.fn();
      const mockLink = { target: { type: 'url' as const, url: 'https://github.com/rhypdf' } };

      await act(async () => {
        root.render(<LinkChip link={mockLink} onEdit={handleEdit} onRemove={handleRemove} />);
      });

      const chip = container.querySelector('[data-testid="link-chip"]');
      expect(chip).not.toBeNull();
      expect(chip?.textContent).toContain('https://github.com/rhypdf');

      const editBtn = container.querySelector('[data-testid="btn-edit-link-chip"]') as HTMLButtonElement;
      await act(async () => {
        editBtn.click();
      });
      expect(handleEdit).toHaveBeenCalled();

      const removeBtn = container.querySelector('[data-testid="btn-remove-link-chip"]') as HTMLButtonElement;
      await act(async () => {
        removeBtn.click();
      });
      expect(handleRemove).toHaveBeenCalled();
    });
  });

  describe('Task 11.7: InsertTableDialog', () => {
    it('configures rows and columns and generates table structure', async () => {
      const handleInsert = vi.fn();
      await act(async () => {
        root.render(
          <InsertTableDialog
            isOpen={true}
            onClose={vi.fn()}
            onInsertTable={handleInsert}
            pageIndex={0}
            pageWidthPt={612}
            pageHeightPt={792}
          />
        );
      });

      const incBtn = document.body.querySelector('[data-testid="btn-table-inc-rows"]') as HTMLButtonElement;
      expect(incBtn).not.toBeNull();
      await act(async () => {
        incBtn.click();
      });

      const confirmBtn = document.body.querySelector('[data-testid="btn-confirm-insert-table"]') as HTMLButtonElement;
      await act(async () => {
        confirmBtn.click();
      });

      expect(handleInsert).toHaveBeenCalled();
      const generated = handleInsert.mock.calls[0][0];
      expect(generated.structure.rowCount).toBe(4);
      expect(generated.structure.colCount).toBe(3);
      expect(generated.textBlocks.length).toBe(12);
    });
  });

  describe('Tasks 11.8 & 11.9: HeaderFooterDialog', () => {
    it('generates headers and footers across pages with token replacement', async () => {
      const handleApply = vi.fn();
      await act(async () => {
        root.render(
          <HeaderFooterDialog
            isOpen={true}
            onClose={vi.fn()}
            onApplyBlocks={handleApply}
            totalPages={3}
            pageWidthPt={612}
            pageHeightPt={792}
          />
        );
      });

      const leftInput = document.body.querySelector('[data-testid="input-hf-header-left"]') as HTMLInputElement;
      expect(leftInput).not.toBeNull();
      await act(async () => {
        setInputValue(leftInput, 'Company Internal');
      });

      const applyBtn = document.body.querySelector('[data-testid="btn-hf-apply"]') as HTMLButtonElement;
      await act(async () => {
        applyBtn.click();
      });

      expect(handleApply).toHaveBeenCalled();
      const blocks = handleApply.mock.calls[0][0];
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks.some((b: any) => b.isHeader)).toBe(true);
    });

    it('switches to Bates numbering tab and generates Bates blocks', async () => {
      const handleApply = vi.fn();
      await act(async () => {
        root.render(
          <HeaderFooterDialog
            isOpen={true}
            onClose={vi.fn()}
            onApplyBlocks={handleApply}
            totalPages={2}
          />
        );
      });

      const batesTab = document.body.querySelector('[data-testid="tab-bates"]') as HTMLButtonElement;
      await act(async () => {
        batesTab.click();
      });

      const prefixInput = document.body.querySelector('[data-testid="input-bates-prefix"]') as HTMLInputElement;
      expect(prefixInput.value).toBe('CONF-');

      await act(async () => {
        setInputValue(prefixInput, 'EXHIBIT-');
      });

      const applyBtn = document.body.querySelector('[data-testid="btn-bates-apply"]') as HTMLButtonElement;
      await act(async () => {
        applyBtn.click();
      });

      expect(handleApply).toHaveBeenCalled();
      const blocks = handleApply.mock.calls[0][0];
      expect(blocks[0].lines[0].text).toContain('EXHIBIT-000001');
    });
  });

  describe('Task 11.10: WatermarkDialog', () => {
    it('configures text watermark with presets and opacity', async () => {
      const handleApply = vi.fn();
      await act(async () => {
        root.render(
          <WatermarkDialog
            isOpen={true}
            onClose={vi.fn()}
            onApplyWatermark={handleApply}
            totalPages={2}
          />
        );
      });

      const draftPreset = document.body.querySelector('[data-testid="wm-preset-draft"]') as HTMLButtonElement;
      await act(async () => {
        draftPreset.click();
      });

      const textInput = document.body.querySelector('[data-testid="input-watermark-text"]') as HTMLInputElement;
      expect(textInput.value).toBe('DRAFT');

      const opacitySlider = document.body.querySelector('[data-testid="input-watermark-opacity"]') as HTMLInputElement;
      await act(async () => {
        setInputValue(opacitySlider, '0.4');
      });

      const applyBtn = document.body.querySelector('[data-testid="btn-watermark-apply"]') as HTMLButtonElement;
      await act(async () => {
        applyBtn.click();
      });

      expect(handleApply).toHaveBeenCalled();
      const objs = handleApply.mock.calls[0][0];
      expect(objs.length).toBe(2);
      expect(objs[0].opacity).toBe(0.4);
    });
  });

  describe('Task 11.13: RulerGridOverlay', () => {
    it('renders top/left rulers and SVG grid overlay when toggled on', async () => {
      await act(async () => {
        root.render(
          <RulerGridOverlay
            pageWidthPt={612}
            pageHeightPt={792}
            showRuler={true}
            showGrid={true}
            scale={1.0}
          />
        );
      });

      expect(container.querySelector('[data-testid="ruler-grid-overlay"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="grid-overlay-svg"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="top-ruler"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="left-ruler"]')).not.toBeNull();
    });
  });

  describe('Task 11.14: SpecialItemsPopover', () => {
    it('inserts formatted date, symbols, and generates vector QR code', async () => {
      const handleText = vi.fn();
      const handlePath = vi.fn();

      await act(async () => {
        root.render(<SpecialItemsPopover onInsertText={handleText} onInsertPath={handlePath} />);
      });

      const menuBtn = container.querySelector('[data-testid="btn-special-items-menu"]') as HTMLButtonElement;
      await act(async () => {
        menuBtn.click();
      });

      // 1. Insert Date
      const dateConfirmBtn = container.querySelector('[data-testid="btn-insert-date-confirm"]') as HTMLButtonElement;
      await act(async () => {
        dateConfirmBtn.click();
      });
      expect(handleText).toHaveBeenCalled();
      expect(handleText.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // 2. Re-open and switch to Symbols
      await act(async () => {
        menuBtn.click();
      });
      const symTab = container.querySelector('[data-testid="tab-special-symbols"]') as HTMLButtonElement;
      await act(async () => {
        symTab.click();
      });
      const firstSymbol = container.querySelector('[data-testid="btn-symbol-0"]') as HTMLButtonElement;
      await act(async () => {
        firstSymbol.click();
      });
      expect(handleText).toHaveBeenCalledTimes(2);

      // 3. Re-open and switch to QR Code
      await act(async () => {
        menuBtn.click();
      });
      const qrTab = container.querySelector('[data-testid="tab-special-qr"]') as HTMLButtonElement;
      await act(async () => {
        qrTab.click();
      });
      const qrInput = container.querySelector('[data-testid="input-qr-content"]') as HTMLInputElement;
      await act(async () => {
        setInputValue(qrInput, 'https://rhypdf.app');
      });
      const qrConfirmBtn = container.querySelector('[data-testid="btn-insert-qr-confirm"]') as HTMLButtonElement;
      await act(async () => {
        qrConfirmBtn.click();
      });

      expect(handlePath).toHaveBeenCalled();
      const qrPath = handlePath.mock.calls[0][0];
      expect(qrPath.type).toBe('path');
      expect(qrPath.fill).toBe(true);
      expect(qrPath.segments.length).toBeGreaterThan(50);
    });
  });
});
