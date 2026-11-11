/**
 * @rhypdf/ocr
 * Task 10.6: Convert OCR output into structured text blocks and PageObjects with typography estimation.
 */

import type { Rect, TextRun, TextRenderMode } from '@rhypdf/pdf-model';
import type { OcrPageResult, OcrLine } from './types';
import { normalizeOcrBoundingBox } from './tesseract-adapter';

export interface ConvertedTextBlock {
  id: string;
  text: string;
  bounds: Rect; // in PDF points
  fontSize: number; // in pt
  fontFamily: string;
  color: string; // hex
  bold: boolean;
  italic: boolean;
  confidence: number;
  lines: Array<{
    text: string;
    bounds: Rect;
    baselineY: number;
  }>;
}

/**
 * Estimates typography and font properties from OCR bounding boxes and word metadata.
 */
export function estimateTypography(
  line: OcrLine,
  scale: number
): { fontSizePt: number; isBold: boolean; isItalic: boolean } {
  const pixelHeight = Math.abs(line.bbox.bottom - line.bbox.top);
  // Cap-height to point size approximation (typically cap-height is ~0.7 to 0.75 of em size)
  let fontSizePt = Math.max(6, Math.min(96, Math.round(pixelHeight * scale * 0.8)));

  let boldCount = 0;
  let italicCount = 0;

  for (const w of line.words) {
    if (w.isBold) boldCount++;
    if (w.isItalic) italicCount++;
    if (w.fontSizePt && w.fontSizePt > 0) {
      fontSizePt = w.fontSizePt;
    }
  }

  const isBold = line.words.length > 0 && boldCount >= line.words.length / 2;
  const isItalic = line.words.length > 0 && italicCount >= line.words.length / 2;

  return { fontSizePt, isBold, isItalic };
}

/**
 * Converts OCR page results into normalized PDF TextBlocks with estimated fonts and sizes.
 */
export function convertOcrToTextBlocks(
  result: OcrPageResult,
  pageWidthPt: number,
  pageHeightPt: number
): ConvertedTextBlock[] {
  const imgWidth = result.imageWidth;
  const imgHeight = result.imageHeight;
  const scaleY = pageHeightPt / Math.max(1, imgHeight);

  const converted: ConvertedTextBlock[] = [];

  for (let bIdx = 0; bIdx < result.blocks.length; bIdx++) {
    const block = result.blocks[bIdx]!;
    const normBlockBbox = normalizeOcrBoundingBox(
      block.bbox,
      imgWidth,
      imgHeight,
      pageWidthPt,
      pageHeightPt
    );

    const convertedLines: ConvertedTextBlock['lines'] = [];
    let dominantFontSize = 12;
    let anyBold = false;
    let anyItalic = false;

    for (const l of block.lines) {
      const normLineBbox = normalizeOcrBoundingBox(
        l.bbox,
        imgWidth,
        imgHeight,
        pageWidthPt,
        pageHeightPt
      );

      const typo = estimateTypography(l, scaleY);
      dominantFontSize = typo.fontSizePt;
      if (typo.isBold) anyBold = true;
      if (typo.isItalic) anyItalic = true;

      // In PDF coordinates, baseline is near bottom of line box
      const baselineY =
        normLineBbox.bottom + Math.abs(normLineBbox.top - normLineBbox.bottom) * 0.2;

      convertedLines.push({
        text: l.text,
        bounds: normLineBbox,
        baselineY
      });
    }

    converted.push({
      id: `ocr-converted-block-${bIdx}`,
      text: block.text,
      bounds: normBlockBbox,
      fontSize: dominantFontSize,
      fontFamily: 'Liberation Sans',
      color: '#000000',
      bold: anyBold,
      italic: anyItalic,
      confidence: block.confidence,
      lines: convertedLines
    });
  }

  return converted;
}

/**
 * Converts OCR lines directly into TextRun PageObjects for PDF insertion.
 */
export function convertOcrToTextRuns(
  result: OcrPageResult,
  pageWidthPt: number,
  pageHeightPt: number,
  renderMode: TextRenderMode = 'fill'
): TextRun[] {
  const blocks = convertOcrToTextBlocks(result, pageWidthPt, pageHeightPt);
  const textRuns: TextRun[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const b = blocks[bIdx]!;
    for (let lIdx = 0; lIdx < b.lines.length; lIdx++) {
      const l = b.lines[lIdx]!;
      textRuns.push({
        id: `ocr-run-${bIdx}-${lIdx}`,
        type: 'text',
        bounds: l.bounds,
        text: l.text,
        fontName: b.bold ? 'Liberation Sans-Bold' : 'Liberation Sans',
        fontSize: b.fontSize,
        fillColor: { r: 0, g: 0, b: 0, a: 1 },
        strokeColor: undefined,
        matrix: [1, 0, 0, 1, l.bounds.left, l.baselineY],
        zIndex: 10 + bIdx * 10 + lIdx,
        renderMode,
        isEmbeddedSubset: false
      });
    }
  }

  return textRuns;
}
