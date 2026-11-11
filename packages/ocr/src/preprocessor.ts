/**
 * @rhypdf/ocr
 * Task 10.4: Image Preprocessing for OCR.
 * Deskew, denoise, contrast stretch, and Otsu/adaptive binarization on ImageData / Canvas.
 */

import type { PreprocessOptions, PreprocessResult } from './types';

/**
 * Cross-environment safe ImageData factory.
 */
export function createImageData(width: number, height: number): ImageData {
  if (typeof globalThis.ImageData !== 'undefined') {
    return new globalThis.ImageData(width, height);
  }
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: 'srgb'
  } as ImageData;
}

/**
 * Calculates optimal scale factor for ~300 DPI while capping total pixels
 * to prevent Out-Of-Memory on mobile/browser heaps.
 */
export function calculateDpiScale(
  widthPt: number,
  heightPt: number,
  targetDpi = 300,
  maxTotalPixels = 16_000_000
): number {
  const desiredScale = targetDpi / 72;
  const totalPixels = widthPt * desiredScale * heightPt * desiredScale;

  if (totalPixels > maxTotalPixels) {
    return Math.sqrt(maxTotalPixels / (widthPt * heightPt));
  }

  return desiredScale;
}

/**
 * Creates a clone of ImageData.
 */
export function cloneImageData(src: ImageData): ImageData {
  const img = createImageData(src.width, src.height);
  img.data.set(src.data);
  return img;
}

/**
 * Converts RGBA image data to 8-bit grayscale array (0-255).
 * ITU-R BT.601 luminance weights: Y = 0.299*R + 0.587*G + 0.114*B
 */
export function toGrayscale(data: ImageData): Uint8ClampedArray {
  const { width, height } = data;
  const gray = new Uint8ClampedArray(width * height);
  const src = data.data;

  for (let i = 0, j = 0; i < src.length; i += 4, j++) {
    const r = src[i]!;
    const g = src[i + 1]!;
    const b = src[i + 2]!;
    gray[j] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return gray;
}

/**
 * Applies a 3x3 median filter on grayscale image to eliminate salt-and-pepper noise.
 */
export function medianFilter3x3(
  gray: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height);
  const window: number[] = new Array(9);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let idx = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          window[idx++] = gray[(y + dy) * width + (x + dx)]!;
        }
      }
      // Sort 9 elements to pick median (index 4)
      window.sort((a, b) => a - b);
      output[y * width + x] = window[4]!;
    }
  }

  // Copy borders
  for (let x = 0; x < width; x++) {
    output[x] = gray[x]!;
    output[(height - 1) * width + x] = gray[(height - 1) * width + x]!;
  }
  for (let y = 0; y < height; y++) {
    output[y * width] = gray[y * width]!;
    output[y * width + (width - 1)] = gray[y * width + (width - 1)]!;
  }

  return output;
}

/**
 * Performs contrast stretching (histogram normalization) so pixel intensities
 * span the full dynamic range [0, 255].
 */
export function contrastStretch(gray: Uint8ClampedArray): Uint8ClampedArray {
  let min = 255;
  let max = 0;

  for (let i = 0; i < gray.length; i++) {
    const val = gray[i]!;
    if (val < min) min = val;
    if (val > max) max = val;
  }

  if (max <= min) return gray;

  const output = new Uint8ClampedArray(gray.length);
  const range = max - min;

  for (let i = 0; i < gray.length; i++) {
    output[i] = Math.round(((gray[i]! - min) / range) * 255);
  }

  return output;
}

/**
 * Computes the optimal global threshold using Otsu's method.
 */
export function computeOtsuThreshold(gray: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0);
  const total = gray.length;

  for (let i = 0; i < total; i++) {
    histogram[gray[i]!]!++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i]!;
  }

  let sumB = 0;
  let wB = 0;
  let wF: number;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t]!;
    if (wB === 0) continue;
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varianceBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Estimates skew angle in degrees using horizontal projection profile variance.
 * Tests angles between -10° and +10° in step increments.
 */
export function estimateSkewAngle(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 128,
  minAngle = -10,
  maxAngle = 10,
  step = 0.5
): number {
  let bestAngle = 0;
  let maxVariance = -1;

  // Downsample large images for rapid angle detection
  const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 300));

  for (let angle = minAngle; angle <= maxAngle; angle += step) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rowCounts = new Array(height).fill(0);
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        if (gray[y * width + x]! < threshold) {
          // Dark pixel (foreground text)
          const rotY = Math.round((x - centerX) * sin + (y - centerY) * cos + centerY);
          if (rotY >= 0 && rotY < height) {
            rowCounts[rotY]!++;
          }
        }
      }
    }

    // Compute variance of row profile counts
    let sum = 0;
    for (let i = 0; i < height; i++) sum += rowCounts[i]!;
    const mean = sum / height;

    let variance = 0;
    for (let i = 0; i < height; i++) {
      const diff = rowCounts[i]! - mean;
      variance += diff * diff;
    }

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

/**
 * Rotates grayscale image by angle in degrees around center.
 */
export function rotateGrayscale(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  angleDeg: number
): Uint8ClampedArray {
  if (Math.abs(angleDeg) < 0.1) return gray;

  const output = new Uint8ClampedArray(width * height).fill(255); // Fill background white
  const rad = (-angleDeg * Math.PI) / 180; // Invert angle for backward mapping
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.round((x - cx) * cos - (y - cy) * sin + cx);
      const srcY = Math.round((x - cx) * sin + (y - cy) * cos + cy);

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        output[y * width + x] = gray[srcY * width + srcX]!;
      }
    }
  }

  return output;
}

/**
 * Full preprocessing pipeline: Grayscale -> Denoise -> Contrast -> Deskew -> Binarize.
 */
export function preprocessImage(
  input: ImageData,
  options: PreprocessOptions = {}
): PreprocessResult {
  const {
    deskew = true,
    denoise = true,
    binarize = true,
    contrastStretch: doContrast = true
  } = options;

  const width = input.width;
  const height = input.height;

  // 1. Grayscale
  let gray = toGrayscale(input);

  // 2. Denoise
  if (denoise && width > 10 && height > 10) {
    gray = medianFilter3x3(gray, width, height);
  }

  // 3. Contrast stretch
  if (doContrast) {
    gray = contrastStretch(gray);
  }

  // 4. Deskew
  let detectedAngle = 0;
  if (deskew) {
    const initialThresh = computeOtsuThreshold(gray);
    detectedAngle = estimateSkewAngle(gray, width, height, initialThresh);
    if (Math.abs(detectedAngle) >= 0.5) {
      gray = rotateGrayscale(gray, width, height, -detectedAngle);
    }
  }

  // 5. Binarize (Otsu threshold)
  const otsuThreshold = computeOtsuThreshold(gray);
  const processedData = createImageData(width, height);
  const out = processedData.data;

  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    const val = binarize ? (gray[i]! < otsuThreshold ? 0 : 255) : gray[i]!;
    out[j] = val;
    out[j + 1] = val;
    out[j + 2] = val;
    out[j + 3] = 255;
  }

  return {
    processedData,
    detectedSkewAngleDeg: detectedAngle,
    originalWidth: width,
    originalHeight: height,
    scaleFactor: 1.0
  };
}
