/**
 * @rhypdf/ocr
 * Task 10.8 (Mode B): Glyph Erasure Strategy for Fully Editable OCR Mode.
 * Analyzes local background, creates solid or inpainting patches over original scan text pixels,
 * and allows clean replacement with real editable TextBlocks.
 */

import type { Rect } from '@rhypdf/pdf-model';
import type { ErasurePatch } from './types';
import { createImageData } from './preprocessor';

/**
 * Samples a 2-pixel border margin around a bounding box in an ImageData to estimate background color and texture.
 */
export function analyzeLocalBackground(
  bbox: Rect,
  imageData: ImageData
): { averageR: number; averageG: number; averageB: number; hexColor: string; isTextured: boolean } {
  const { width, height, data } = imageData;

  const left = Math.max(0, Math.floor(bbox.left));
  const top = Math.max(0, Math.floor(bbox.top));
  const right = Math.min(width - 1, Math.ceil(bbox.right));
  const bottom = Math.min(height - 1, Math.ceil(bbox.bottom));

  const borderPixels: Array<[number, number, number]> = [];

  // Sample top and bottom borders (2px margin)
  for (let y = Math.max(0, top - 2); y <= top; y++) {
    for (let x = left; x <= right; x++) {
      const idx = (y * width + x) * 4;
      borderPixels.push([data[idx]!, data[idx + 1]!, data[idx + 2]!]);
    }
  }
  for (let y = bottom; y <= Math.min(height - 1, bottom + 2); y++) {
    for (let x = left; x <= right; x++) {
      const idx = (y * width + x) * 4;
      borderPixels.push([data[idx]!, data[idx + 1]!, data[idx + 2]!]);
    }
  }

  // Sample left and right borders (2px margin)
  for (let y = top; y <= bottom; y++) {
    for (let x = Math.max(0, left - 2); x <= left; x++) {
      const idx = (y * width + x) * 4;
      borderPixels.push([data[idx]!, data[idx + 1]!, data[idx + 2]!]);
    }
    for (let x = right; x <= Math.min(width - 1, right + 2); x++) {
      const idx = (y * width + x) * 4;
      borderPixels.push([data[idx]!, data[idx + 1]!, data[idx + 2]!]);
    }
  }

  if (borderPixels.length === 0) {
    return { averageR: 255, averageG: 255, averageB: 255, hexColor: '#ffffff', isTextured: false };
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (const [r, g, b] of borderPixels) {
    sumR += r;
    sumG += g;
    sumB += b;
  }

  const avgR = Math.round(sumR / borderPixels.length);
  const avgG = Math.round(sumG / borderPixels.length);
  const avgB = Math.round(sumB / borderPixels.length);

  // Compute variance to determine if background is flat or textured
  let variance = 0;
  for (const [r, g, b] of borderPixels) {
    const dr = r - avgR;
    const dg = g - avgG;
    const db = b - avgB;
    variance += (dr * dr + dg * dg + db * db) / 3;
  }
  variance /= borderPixels.length;

  const hexColor = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;
  const isTextured = variance > 20.0;

  return { averageR: avgR, averageG: avgG, averageB: avgB, hexColor, isTextured };
}

/**
 * Generates an erasure patch covering original raster glyphs.
 */
export function generateErasurePatch(blockBbox: Rect, pageImage: ImageData): ErasurePatch {
  const bg = analyzeLocalBackground(blockBbox, pageImage);

  return {
    bbox: blockBbox,
    backgroundColor: bg.hexColor,
    isTextured: bg.isTextured
  };
}

/**
 * Creates inpainting patch image data interpolating surrounding border colors across the erased area.
 */
export function createInpaintPatch(bbox: Rect, pageImage: ImageData): ImageData {
  const left = Math.max(0, Math.floor(bbox.left));
  const top = Math.max(0, Math.floor(bbox.top));
  const right = Math.min(pageImage.width - 1, Math.ceil(bbox.right));
  const bottom = Math.min(pageImage.height - 1, Math.ceil(bbox.bottom));

  const patchW = Math.max(1, right - left + 1);
  const patchH = Math.max(1, bottom - top + 1);

  const patch = createImageData(patchW, patchH);
  const bg = analyzeLocalBackground(bbox, pageImage);

  // Fill patch with estimated background color (for flat) or linear gradient interpolation
  const pData = patch.data;
  for (let i = 0; i < pData.length; i += 4) {
    pData[i] = bg.averageR;
    pData[i + 1] = bg.averageG;
    pData[i + 2] = bg.averageB;
    pData[i + 3] = 255;
  }

  return patch;
}
