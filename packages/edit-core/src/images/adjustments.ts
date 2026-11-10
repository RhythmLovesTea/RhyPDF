import type { Rect } from '@rhypdf/pdf-model';
import type { ImageAdjustments, CropPreset, ReplaceFitMode } from './types';

/**
 * Applies brightness, contrast, grayscale, and opacity transformations to RGBA pixel bytes.
 */
export function applyPixelAdjustments(
  rgba: Uint8ClampedArray | Uint8Array,
  adjustments: ImageAdjustments
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(rgba.length);
  result.set(rgba);

  const { opacity, brightness, contrast, grayscale } = adjustments;

  // Pre-calculate brightness offset (-255 to +255)
  const bOffset = (brightness / 100) * 255;

  // Pre-calculate contrast factor
  // Standard formula: F = (259 * (C + 255)) / (255 * (259 - C)) where C is clamped to [-254, 254]
  const clampedC = Math.max(-254, Math.min(254, (contrast / 100) * 255));
  const cFactor = (259 * (clampedC + 255)) / (255 * (259 - clampedC));

  const alphaFactor = Math.max(0, Math.min(1, opacity / 100));

  for (let i = 0; i < result.length; i += 4) {
    let r = result[i] ?? 0;
    let g = result[i + 1] ?? 0;
    let b = result[i + 2] ?? 0;
    let a = result[i + 3] ?? 255;

    // 1. Grayscale (ITU-R BT.601 standard weights)
    if (grayscale) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray;
      g = gray;
      b = gray;
    }

    // 2. Brightness
    if (bOffset !== 0) {
      r += bOffset;
      g += bOffset;
      b += bOffset;
    }

    // 3. Contrast
    if (contrast !== 0) {
      r = cFactor * (r - 128) + 128;
      g = cFactor * (g - 128) + 128;
      b = cFactor * (b - 128) + 128;
    }

    // 4. Opacity
    if (alphaFactor < 1) {
      a = Math.round(a * alphaFactor);
    }

    result[i] = Math.max(0, Math.min(255, Math.round(r)));
    result[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    result[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    result[i + 3] = Math.max(0, Math.min(255, a));
  }

  return result;
}

/**
 * Computes preset aspect ratios for crop operations.
 */
export function getPresetRatio(preset: CropPreset): number | null {
  switch (preset) {
    case '1:1':
      return 1.0;
    case '4:3':
      return 4 / 3;
    case '16:9':
      return 16 / 9;
    case 'free':
    default:
      return null;
  }
}

/**
 * Computes a centered crop rectangle within existing bounds matching a crop preset.
 */
export function calculatePresetCropBox(bounds: Rect, preset: CropPreset): Rect {
  const targetRatio = getPresetRatio(preset);
  const w = Math.abs(bounds.right - bounds.left);
  const h = Math.abs(bounds.top - bounds.bottom);

  if (!targetRatio || w <= 0 || h <= 0) {
    return { ...bounds };
  }

  const currentRatio = w / h;
  let newW = w;
  let newH = h;

  if (currentRatio > targetRatio) {
    // Current is wider than target: trim width
    newW = h * targetRatio;
  } else {
    // Current is taller than target: trim height
    newH = w / targetRatio;
  }

  const midX = (bounds.left + bounds.right) / 2;
  const midY = (bounds.bottom + bounds.top) / 2;

  return {
    left: Math.round((midX - newW / 2) * 10) / 10,
    right: Math.round((midX + newW / 2) * 10) / 10,
    bottom: Math.round((midY - newH / 2) * 10) / 10,
    top: Math.round((midY + newH / 2) * 10) / 10
  };
}

/**
 * Calculates new bounds when replacing an image under 'fit', 'fill', or 'stretch'.
 */
export function calculateReplacedBounds(
  originalBounds: Rect,
  newPixelWidth: number,
  newPixelHeight: number,
  mode: ReplaceFitMode
): Rect {
  if (mode === 'stretch' || newPixelWidth <= 0 || newPixelHeight <= 0) {
    return { ...originalBounds };
  }

  const origW = Math.abs(originalBounds.right - originalBounds.left);
  const origH = Math.abs(originalBounds.top - originalBounds.bottom);
  const newRatio = newPixelWidth / newPixelHeight;

  let targetW = origW;
  let targetH = origH;

  if (mode === 'fit') {
    // Scale to fit inside original box without cropping
    if (origW / origH > newRatio) {
      targetW = origH * newRatio;
    } else {
      targetH = origW / newRatio;
    }
  } else if (mode === 'fill') {
    // Scale to fill original box completely
    if (origW / origH > newRatio) {
      targetH = origW / newRatio;
    } else {
      targetW = origH * newRatio;
    }
  }

  const midX = (originalBounds.left + originalBounds.right) / 2;
  const midY = (originalBounds.bottom + originalBounds.top) / 2;

  return {
    left: Math.round((midX - targetW / 2) * 10) / 10,
    right: Math.round((midX + targetW / 2) * 10) / 10,
    bottom: Math.round((midY - targetH / 2) * 10) / 10,
    top: Math.round((midY + targetH / 2) * 10) / 10
  };
}
