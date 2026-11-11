/**
 * @rhypdf/ocr
 * Task 10.14: Handwriting Detection and Warning Heuristics.
 * Flags scanned pages/regions that are likely handwritten so users receive a clear notice.
 */

import type { OcrPageResult } from './types';

export interface HandwritingCheckResult {
  isLikelyHandwritten: boolean;
  confidenceScore: number; // 0 to 1
  reason: string;
}

/**
 * Checks whether an OCR result appears to be handwritten rather than printed text.
 */
export function checkIsHandwriting(result: OcrPageResult): HandwritingCheckResult {
  const words = result.blocks.flatMap((b) => b.lines.flatMap((l) => l.words));

  if (words.length < 3) {
    return {
      isLikelyHandwritten: false,
      confidenceScore: 0.1,
      reason: 'Insufficient text to determine typography modality.'
    };
  }

  // 1. Measure mean confidence
  const meanConf = result.meanConfidence;

  // 2. Measure bounding box aspect ratio variance (handwritten text has erratic letter heights)
  const lineHeights = result.blocks.flatMap((b) =>
    b.lines.map((l) => Math.abs(l.bbox.bottom - l.bbox.top))
  );

  let heightVariance = 0;
  if (lineHeights.length > 1) {
    const avgHeight = lineHeights.reduce((a, b) => a + b, 0) / lineHeights.length;
    heightVariance =
      lineHeights.reduce((acc, h) => acc + (h - avgHeight) * (h - avgHeight), 0) /
      lineHeights.length;
  }

  // Criteria: printed text on clean scans typically has >80% confidence and low height variance
  if (meanConf < 45 || (meanConf < 55 && heightVariance > 50)) {
    return {
      isLikelyHandwritten: true,
      confidenceScore: Math.min(0.95, (60 - meanConf) / 40 + 0.5),
      reason:
        'Low OCR confidence and high vertical variance detected. Hand-drawn or cursive text suspected.'
    };
  }

  return {
    isLikelyHandwritten: false,
    confidenceScore: 0.1,
    reason: 'Printed typeface characteristics confirmed.'
  };
}
