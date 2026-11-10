import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n } from '@rhypdf/i18n';
import type { ImageObject } from '@rhypdf/pdf-model';
import { ContextualToolbar } from '../../src/features/editor/ContextualToolbar';
import { PropertiesPanel, SelectedObjectProps } from '../../src/features/editor/PropertiesPanel';
import { SelectionOverlay } from '../../src/features/editor/SelectionOverlay';
import { useDocStore } from '../../src/stores/docStore';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Phase 6 UI: Image Editing Tools, Properties Panel, and Overlays', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    initI18n('en');
  });

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

  describe('ContextualToolbar in edit-images mode', () => {
    beforeEach(() => {
      act(() => {
        useDocStore.getState().setActiveMode('edit-images');
      });
    });

    it('renders image insertion button when nothing is selected', () => {
      act(() => {
        root.render(<ContextualToolbar hasSelectedImage={false} />);
      });

      const insertBtn = container.querySelector('[data-testid="btn-insert-image"]');
      expect(insertBtn).not.toBeNull();
    });

    it('renders full image toolbar controls when an image is selected', () => {
      const onRotateCw = vi.fn();
      const onRotateCcw = vi.fn();
      const onFlipHorizontal = vi.fn();
      const onFlipVertical = vi.fn();
      const onDeleteImage = vi.fn();
      const onOpacityChange = vi.fn();

      act(() => {
        root.render(
          <ContextualToolbar
            hasSelectedImage={true}
            onRotateCw={onRotateCw}
            onRotateCcw={onRotateCcw}
            onFlipHorizontal={onFlipHorizontal}
            onFlipVertical={onFlipVertical}
            onDeleteImage={onDeleteImage}
            onOpacityChange={onOpacityChange}
            effectiveDpi={120}
            isLowRes={true}
          />
        );
      });

      // Rotate buttons
      const rotCwBtn = container.querySelector(
        '[data-testid="btn-image-rotate-cw"]'
      ) as HTMLButtonElement;
      const rotCcwBtn = container.querySelector(
        '[data-testid="btn-image-rotate-ccw"]'
      ) as HTMLButtonElement;
      expect(rotCwBtn).not.toBeNull();
      expect(rotCcwBtn).not.toBeNull();

      act(() => {
        rotCwBtn.click();
        rotCcwBtn.click();
      });
      expect(onRotateCw).toHaveBeenCalledTimes(1);
      expect(onRotateCcw).toHaveBeenCalledTimes(1);

      // Flip buttons
      const flipHBtn = container.querySelector(
        '[data-testid="btn-image-flip-h"]'
      ) as HTMLButtonElement;
      const flipVBtn = container.querySelector(
        '[data-testid="btn-image-flip-v"]'
      ) as HTMLButtonElement;
      expect(flipHBtn).not.toBeNull();
      expect(flipVBtn).not.toBeNull();

      act(() => {
        flipHBtn.click();
        flipVBtn.click();
      });
      expect(onFlipHorizontal).toHaveBeenCalledTimes(1);
      expect(onFlipVertical).toHaveBeenCalledTimes(1);

      // Opacity slider
      const opacitySlider = container.querySelector(
        '[data-testid="input-image-opacity"]'
      ) as HTMLInputElement;
      expect(opacitySlider).not.toBeNull();
      act(() => {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeSetter?.call(opacitySlider, '70');
        opacitySlider.dispatchEvent(new Event('input', { bubbles: true }));
        opacitySlider.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(onOpacityChange).toHaveBeenCalledWith(70);

      // Low resolution badge (< 150 DPI)
      const lowDpiBadge = container.querySelector('[data-testid="toolbar-low-dpi-warning"]');
      expect(lowDpiBadge).not.toBeNull();
      expect(lowDpiBadge?.textContent).toContain('120 DPI');

      // Delete image button
      const deleteBtn = container.querySelector(
        '[data-testid="btn-image-delete"]'
      ) as HTMLButtonElement;
      expect(deleteBtn).not.toBeNull();
      act(() => {
        deleteBtn.click();
      });
      expect(onDeleteImage).toHaveBeenCalledTimes(1);
    });

    it('renders crop controls when crop mode is active', () => {
      const onApplyCrop = vi.fn();
      const onCancelCrop = vi.fn();

      act(() => {
        root.render(
          <ContextualToolbar
            hasSelectedImage={true}
            isCropping={true}
            onApplyCrop={onApplyCrop}
            onCancelCrop={onCancelCrop}
          />
        );
      });

      const applyBtn = container.querySelector(
        '[data-testid="btn-apply-crop"]'
      ) as HTMLButtonElement;
      const cancelBtn = container.querySelector(
        '[data-testid="btn-cancel-crop"]'
      ) as HTMLButtonElement;
      expect(applyBtn).not.toBeNull();
      expect(cancelBtn).not.toBeNull();

      act(() => {
        applyBtn.click();
        cancelBtn.click();
      });
      expect(onApplyCrop).toHaveBeenCalledTimes(1);
      expect(onCancelCrop).toHaveBeenCalledTimes(1);
    });
  });

  describe('PropertiesPanel with selected image', () => {
    it('displays image dimensions, effective DPI, adjustments, and unit switching', () => {
      const onUpdateObject = vi.fn();
      const onDownloadImage = vi.fn();

      const selectedObj: SelectedObjectProps = {
        id: 'img-123',
        type: 'image',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 90,
        pixelWidth: 400,
        pixelHeight: 300,
        effectiveDpi: 144,
        isLowRes: true,
        brightness: 10,
        contrast: 5,
        grayscale: false
      };

      act(() => {
        root.render(
          <PropertiesPanel
            open={true}
            onToggle={() => {}}
            selectedObject={selectedObj}
            onUpdateObject={onUpdateObject}
            onDownloadImage={onDownloadImage}
          />
        );
      });

      // Panel is open
      const panel = container.querySelector('[data-testid="properties-panel"]');
      expect(panel).not.toBeNull();

      // Low resolution badge
      const lowDpiWarning = container.querySelector('[data-testid="low-dpi-warning"]');
      expect(lowDpiWarning).not.toBeNull();
      expect(lowDpiWarning?.textContent).toContain('144 DPI');

      // Unit select
      const unitSelect = container.querySelector(
        '[data-testid="select-prop-unit"]'
      ) as HTMLSelectElement;
      expect(unitSelect).not.toBeNull();
      expect(unitSelect.value).toBe('pt');

      // Image adjustments sliders
      const brightnessInput = container.querySelector(
        '[data-testid="input-prop-brightness"]'
      ) as HTMLInputElement;
      const contrastInput = container.querySelector(
        '[data-testid="input-prop-contrast"]'
      ) as HTMLInputElement;
      const grayscaleCheckbox = container.querySelector(
        '[data-testid="checkbox-prop-grayscale"]'
      ) as HTMLInputElement;

      expect(brightnessInput).not.toBeNull();
      expect(contrastInput).not.toBeNull();
      expect(grayscaleCheckbox).not.toBeNull();

      act(() => {
        grayscaleCheckbox.click();
      });
      expect(onUpdateObject).toHaveBeenCalledWith(expect.objectContaining({ grayscale: true }));

      // Extract / Download Image button
      const downloadBtn = container.querySelector(
        '[data-testid="btn-download-image"]'
      ) as HTMLButtonElement;
      expect(downloadBtn).not.toBeNull();
      act(() => {
        downloadBtn.click();
      });
      expect(onDownloadImage).toHaveBeenCalledTimes(1);
    });
  });

  describe('SelectionOverlay for image crop', () => {
    it('renders crop-overlay-rect when isCropping is active', () => {
      const img: ImageObject = {
        id: 'img-1',
        type: 'image',
        pixelWidth: 400,
        pixelHeight: 300,
        bounds: { left: 50, bottom: 50, right: 250, top: 200 },
        matrix: [1, 0, 0, 1, 50, 50],
        zIndex: 1
      };

      act(() => {
        root.render(
          <SelectionOverlay
            pageWidthPt={595}
            pageHeightPt={842}
            rotation={0}
            scale={1.0}
            pageObjects={[img]}
            selectedIds={['img-1']}
            isCropping={true}
            cropBoxPdf={{ left: 70, bottom: 70, right: 230, top: 180 }}
          />
        );
      });

      const cropOverlay = container.querySelector('[data-testid="crop-overlay-rect"]');
      expect(cropOverlay).not.toBeNull();
      expect(cropOverlay?.getAttribute('stroke-dasharray')).toBe('6 3');
    });
  });
});
