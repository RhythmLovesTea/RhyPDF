import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface GoldenCompareOptions {
  /**
   * Matching threshold (0 to 1); smaller is more sensitive. Default: 0.1
   */
  threshold?: number;
  /**
   * Whether to count anti-aliased pixels as differences. Default: false
   */
  includeAA?: boolean;
  /**
   * Maximum acceptable difference in pixels before test fails. Default: 0
   */
  maxDiffPixels?: number;
  /**
   * Maximum acceptable percentage difference (0 to 100). Default: 0.05%
   */
  maxDiffPercentage?: number;
  /**
   * Generate diff image buffer in the result. Default: true
   */
  generateDiffImage?: boolean;
}

export interface GoldenComparisonResult {
  matched: boolean;
  diffPixels: number;
  totalPixels: number;
  diffPercentage: number;
  width: number;
  height: number;
  diffPngBuffer?: Buffer;
}

/**
 * Compare two raw RGBA pixel arrays with pixelmatch.
 */
export function comparePixels(
  data1: Uint8Array | Uint8ClampedArray,
  data2: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: GoldenCompareOptions = {}
): GoldenComparisonResult {
  const {
    threshold = 0.1,
    includeAA = false,
    maxDiffPixels = 0,
    maxDiffPercentage = 0.05,
    generateDiffImage = true
  } = options;

  const totalPixels = width * height;
  const diffData = generateDiffImage ? new Uint8Array(width * height * 4) : null;

  const diffPixels = pixelmatch(data1, data2, diffData, width, height, {
    threshold,
    includeAA,
    diffColor: [255, 0, 0] // Red for differences
  });

  const diffPercentage = (diffPixels / totalPixels) * 100;
  const matched = diffPixels <= maxDiffPixels || diffPercentage <= maxDiffPercentage;

  let diffPngBuffer: Buffer | undefined;
  if (generateDiffImage && diffData) {
    const png = new PNG({ width, height });
    png.data = Buffer.from(diffData.buffer, diffData.byteOffset, diffData.byteLength);
    diffPngBuffer = PNG.sync.write(png);
  }

  return {
    matched,
    diffPixels,
    totalPixels,
    diffPercentage,
    width,
    height,
    diffPngBuffer
  };
}

/**
 * Compare two PNG encoded image buffers.
 */
export function comparePngBuffers(
  pngBuffer1: Buffer | Uint8Array,
  pngBuffer2: Buffer | Uint8Array,
  options: GoldenCompareOptions = {}
): GoldenComparisonResult {
  const buf1 = Buffer.isBuffer(pngBuffer1) ? pngBuffer1 : Buffer.from(pngBuffer1);
  const buf2 = Buffer.isBuffer(pngBuffer2) ? pngBuffer2 : Buffer.from(pngBuffer2);

  const png1 = PNG.sync.read(buf1);
  const png2 = PNG.sync.read(buf2);

  if (png1.width !== png2.width || png1.height !== png2.height) {
    throw new Error(
      `Image dimensions do not match: ${png1.width}x${png1.height} vs ${png2.width}x${png2.height}`
    );
  }

  return comparePixels(png1.data, png2.data, png1.width, png1.height, options);
}

/**
 * Creates a synthetic PNG image buffer for testing.
 */
export function createSyntheticPng(
  width: number,
  height: number,
  fillRgba: [number, number, number, number] = [255, 255, 255, 255]
): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = fillRgba[0];
      png.data[idx + 1] = fillRgba[1];
      png.data[idx + 2] = fillRgba[2];
      png.data[idx + 3] = fillRgba[3];
    }
  }
  return PNG.sync.write(png);
}
