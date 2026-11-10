import { describe, it, expect } from 'vitest';
import type { Rect, Matrix2D, ImageObject } from '@rhypdf/pdf-model';
import {
  calculateEffectiveDpi,
  convertPtToUnit,
  isLargePageImage,
  applyPixelAdjustments,
  getPresetRatio,
  calculatePresetCropBox,
  calculateReplacedBounds,
  CropImageCommand,
  ReplaceImageCommand,
  AdjustImageCommand,
  FlipImageCommand,
  type ImageAdjustments
} from '../src/index';

function createMockImage(
  id = 'img-1',
  bounds: Rect = { left: 50, bottom: 50, right: 250, top: 150 }
): ImageObject {
  return {
    id,
    type: 'image',
    pixelWidth: 600,
    pixelHeight: 300,
    effectiveDpi: { x: 216, y: 216 },
    bounds,
    matrix: [1, 0, 0, 1, 50, 50],
    zIndex: 1
  };
}

describe('Phase 6: Image Operations and Adjustments', () => {
  describe('Task 6.1 & 6.4: Effective DPI Calculation and Unit Conversion', () => {
    it('calculates effective DPI correctly based on pixel dimensions and PDF points', () => {
      // 300px across 72pt (1 inch) => 300 DPI
      // 200px across 72pt (1 inch) => 200 DPI
      const bounds: Rect = { left: 0, bottom: 0, right: 72, top: 72 };
      const dpiResult = calculateEffectiveDpi(300, 200, bounds);

      expect(dpiResult.dpiX).toBe(300);
      expect(dpiResult.dpiY).toBe(200);
      expect(dpiResult.minDpi).toBe(200);
      expect(dpiResult.isLowRes).toBe(false);
    });

    it('flags low resolution when effective DPI drops below 150 DPI', () => {
      // 100px across 144pt (2 inches) => 50 DPI
      const bounds: Rect = { left: 10, bottom: 10, right: 154, top: 154 };
      const dpiResult = calculateEffectiveDpi(100, 100, bounds);

      expect(dpiResult.dpiX).toBe(50);
      expect(dpiResult.dpiY).toBe(50);
      expect(dpiResult.minDpi).toBe(50);
      expect(dpiResult.isLowRes).toBe(true);
    });

    it('handles degenerate or zero dimensions gracefully', () => {
      const bounds: Rect = { left: 50, bottom: 50, right: 50, top: 50 };
      const dpiResult = calculateEffectiveDpi(0, 0, bounds);

      expect(dpiResult.isLowRes).toBe(true);
      expect(dpiResult.minDpi).toBe(72);
    });

    it('converts PDF points to specified units', () => {
      const pt = 72; // exactly 1 inch
      expect(convertPtToUnit(pt, 'pt')).toBe(72);
      expect(convertPtToUnit(pt, 'in')).toBe(1);
      expect(convertPtToUnit(pt, 'px')).toBe(96); // 72pt * 96/72 = 96px
      expect(convertPtToUnit(pt, 'mm')).toBe(25.4); // 72 * 0.352778 ~= 25.4mm
    });
  });

  describe('Task 6.7: Background / Full Page Image Detection', () => {
    it('detects images covering >= 80% of page area as large background images', () => {
      const pageSize = { width: 595, height: 842 }; // A4
      // Full page image
      const fullPageBounds: Rect = { left: 0, bottom: 0, right: 595, top: 842 };
      expect(isLargePageImage(fullPageBounds, pageSize, 0.8)).toBe(true);

      // 85% area image
      const largeBounds: Rect = { left: 20, bottom: 20, right: 575, top: 820 };
      expect(isLargePageImage(largeBounds, pageSize, 0.8)).toBe(true);

      // Small 200x200 logo
      const smallBounds: Rect = { left: 50, bottom: 50, right: 250, top: 250 };
      expect(isLargePageImage(smallBounds, pageSize, 0.8)).toBe(false);
    });

    it('handles invalid or zero page area safely', () => {
      const bounds: Rect = { left: 0, bottom: 0, right: 100, top: 100 };
      expect(isLargePageImage(bounds, { width: 0, height: 0 })).toBe(false);
    });
  });

  describe('Task 6.10: Image Adjustments (Brightness, Contrast, Grayscale, Opacity)', () => {
    it('applies grayscale using ITU-R BT.601 luminance weights', () => {
      // Pure Red [255, 0, 0, 255]
      // Grayscale = 0.299 * 255 = ~76
      const pixels = new Uint8ClampedArray([255, 0, 0, 255]);
      const adj: ImageAdjustments = { opacity: 100, brightness: 0, contrast: 0, grayscale: true };
      const output = applyPixelAdjustments(pixels, adj);

      expect(output[0]).toBe(76);
      expect(output[1]).toBe(76);
      expect(output[2]).toBe(76);
      expect(output[3]).toBe(255);
    });

    it('applies brightness adjustments correctly', () => {
      const pixels = new Uint8ClampedArray([100, 100, 100, 255]);
      // +20% brightness => +51 offset
      const adj: ImageAdjustments = { opacity: 100, brightness: 20, contrast: 0, grayscale: false };
      const output = applyPixelAdjustments(pixels, adj);

      expect(output[0]).toBe(151);
      expect(output[1]).toBe(151);
      expect(output[2]).toBe(151);
      expect(output[3]).toBe(255);
    });

    it('applies contrast adjustments with proper clamping', () => {
      const pixels = new Uint8ClampedArray([50, 128, 200, 255]);
      const adj: ImageAdjustments = { opacity: 100, brightness: 0, contrast: 50, grayscale: false };
      const output = applyPixelAdjustments(pixels, adj);

      // Contrast pushes values away from middle gray (128)
      expect(output[0]).toBeLessThan(50);
      expect(output[1]).toBe(128); // 128 is center anchor
      expect(output[2]).toBeGreaterThan(200);
      expect(output[3]).toBe(255);
    });

    it('applies opacity scaling to alpha channel', () => {
      const pixels = new Uint8ClampedArray([200, 150, 100, 200]);
      const adj: ImageAdjustments = { opacity: 50, brightness: 0, contrast: 0, grayscale: false };
      const output = applyPixelAdjustments(pixels, adj);

      expect(output[0]).toBe(200);
      expect(output[1]).toBe(150);
      expect(output[2]).toBe(100);
      expect(output[3]).toBe(100); // 200 * 50% = 100
    });
  });

  describe('Task 6.6: Crop Preset Aspect Ratios and Bounds', () => {
    it('returns correct preset aspect ratios', () => {
      expect(getPresetRatio('1:1')).toBe(1.0);
      expect(getPresetRatio('4:3')).toBeCloseTo(1.333, 2);
      expect(getPresetRatio('16:9')).toBeCloseTo(1.777, 2);
      expect(getPresetRatio('free')).toBeNull();
    });

    it('calculates centered 1:1 square crop box from a rectangular image', () => {
      // 200 wide x 100 high image centered at (150, 150)
      const bounds: Rect = { left: 50, bottom: 100, right: 250, top: 200 };
      const squareCrop = calculatePresetCropBox(bounds, '1:1');

      const width = squareCrop.right - squareCrop.left;
      const height = squareCrop.top - squareCrop.bottom;
      expect(width).toBe(100);
      expect(height).toBe(100);
      // Center remains (150, 150)
      expect((squareCrop.left + squareCrop.right) / 2).toBe(150);
      expect((squareCrop.bottom + squareCrop.top) / 2).toBe(150);
    });

    it('returns original bounds when preset is free', () => {
      const bounds: Rect = { left: 20, bottom: 30, right: 120, top: 130 };
      expect(calculatePresetCropBox(bounds, 'free')).toEqual(bounds);
    });
  });

  describe('Task 6.8: Replace Bounds Calculation (fit, fill, stretch)', () => {
    const originalBounds: Rect = { left: 0, bottom: 0, right: 200, top: 100 }; // 2:1 ratio

    it('leaves bounds unchanged under stretch mode', () => {
      const result = calculateReplacedBounds(originalBounds, 500, 500, 'stretch');
      expect(result).toEqual(originalBounds);
    });

    it('calculates fitted bounds fitting within original box', () => {
      // Replacement is 1:1 square (400x400)
      const result = calculateReplacedBounds(originalBounds, 400, 400, 'fit');
      const width = result.right - result.left;
      const height = result.top - result.bottom;

      expect(width).toBe(100);
      expect(height).toBe(100);
      // Centered at (100, 50)
      expect(result.left).toBe(50);
      expect(result.right).toBe(150);
      expect(result.bottom).toBe(0);
      expect(result.top).toBe(100);
    });

    it('calculates filled bounds covering original box', () => {
      // Replacement is 1:1 square (400x400) inside 200x100
      const result = calculateReplacedBounds(originalBounds, 400, 400, 'fill');
      const width = result.right - result.left;
      const height = result.top - result.bottom;

      expect(width).toBe(200);
      expect(height).toBe(200);
    });
  });

  describe('Image Edit Commands (Undo/Redo)', () => {
    it('CropImageCommand applies and reverts bounds correctly', async () => {
      let currentBounds: Rect = { left: 0, bottom: 0, right: 200, top: 200 };
      const newBounds: Rect = { left: 50, bottom: 50, right: 150, top: 150 };

      const cmd = new CropImageCommand(0, 'img-1', currentBounds, newBounds, (_p, _id, b) => {
        currentBounds = b;
      });

      await cmd.apply();
      expect(currentBounds).toEqual(newBounds);

      await cmd.revert();
      expect(currentBounds).toEqual({ left: 0, bottom: 0, right: 200, top: 200 });
    });

    it('ReplaceImageCommand updates and reverts image object', async () => {
      const oldImg = createMockImage('img-old');
      const newImg = createMockImage('img-new');
      let currentImg = oldImg;

      const cmd = new ReplaceImageCommand(0, 'img-old', oldImg, newImg, (_p, _id, img) => {
        currentImg = img;
      });

      await cmd.apply();
      expect(currentImg.id).toBe('img-new');

      await cmd.revert();
      expect(currentImg.id).toBe('img-old');
    });

    it('AdjustImageCommand updates and reverts adjustments', async () => {
      let adjustments: ImageAdjustments = {
        opacity: 100,
        brightness: 0,
        contrast: 0,
        grayscale: false
      };
      const newAdjustments: ImageAdjustments = {
        opacity: 75,
        brightness: 15,
        contrast: -10,
        grayscale: true
      };

      const cmd = new AdjustImageCommand(
        0,
        'img-1',
        adjustments,
        newAdjustments,
        (_p, _id, adj) => {
          adjustments = adj;
        }
      );

      await cmd.apply();
      expect(adjustments.opacity).toBe(75);
      expect(adjustments.grayscale).toBe(true);

      await cmd.revert();
      expect(adjustments.opacity).toBe(100);
      expect(adjustments.grayscale).toBe(false);
    });

    it('FlipImageCommand modifies transform matrix for horizontal and vertical flip', async () => {
      const oldMatrix: Matrix2D = [1, 0, 0, 1, 100, 100];
      let currentMatrix = oldMatrix;

      const hCmd = new FlipImageCommand(0, 'img-1', oldMatrix, 'horizontal', (_p, _id, m) => {
        currentMatrix = m;
      });

      await hCmd.apply();
      expect(currentMatrix[0]).toBe(-1); // a negated
      expect(currentMatrix[1]).toBe(0);
      expect(currentMatrix[2]).toBe(-0); // -c
      expect(currentMatrix[3]).toBe(1);

      await hCmd.revert();
      expect(currentMatrix).toEqual(oldMatrix);

      const vCmd = new FlipImageCommand(0, 'img-1', oldMatrix, 'vertical', (_p, _id, m) => {
        currentMatrix = m;
      });

      await vCmd.apply();
      expect(currentMatrix[0]).toBe(1);
      expect(currentMatrix[1]).toBe(-0); // -b
      expect(currentMatrix[2]).toBe(0);
      expect(currentMatrix[3]).toBe(-1); // d negated

      await vCmd.revert();
      expect(currentMatrix).toEqual(oldMatrix);
    });
  });
});
