/**
 * @rhypdf/edit-core
 * Task 11.8: Header & Footer generator.
 * Supports text, "Page X of Y", date, left/center/right alignment, first-page-different.
 */

import type { Rect, ColorRGBA } from '@rhypdf/pdf-model';
import type { TextBlock } from '../text/types';
import type { HeaderFooterConfig, HeaderFooterSection } from './types';

/**
 * Replaces tokens in header/footer text:
 * {page} -> pageNum (1-based)
 * {pages} -> totalPages
 * {date} -> formatted date YYYY-MM-DD
 */
export function substituteTokens(
  template: string,
  pageIndex: number,
  totalPages: number,
  dateStr?: string
): string {
  const pageNum = pageIndex + 1;
  const today = dateStr ?? new Date().toISOString().split('T')[0]!;
  return template
    .replace(/\{page\}/gi, String(pageNum))
    .replace(/\{pages\}/gi, String(totalPages))
    .replace(/\{date\}/gi, today);
}

export function generateHeaderFooterBlocks(
  config: HeaderFooterConfig,
  pageIndex: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number
): TextBlock[] {
  const blocks: TextBlock[] = [];
  const margin = config.margin ?? 36; // 0.5 inch margin
  const fontSize = config.fontSize ?? 10;
  const fontName = config.fontName ?? 'Roboto-Regular';
  const color: ColorRGBA = config.color ?? { r: 100, g: 116, b: 139, a: 255 }; // slate-500
  const isFirstPage = pageIndex === 0;

  // Decide header section to use
  let headerSec: HeaderFooterSection | undefined = config.header;
  if (isFirstPage && config.firstPageDifferent) {
    headerSec = config.firstPageHeader ?? config.header;
  }

  // Decide footer section to use
  let footerSec: HeaderFooterSection | undefined = config.footer;
  if (isFirstPage && config.firstPageDifferent) {
    footerSec = config.firstPageFooter ?? config.footer;
  }

  const headerY = pageHeight - margin;
  const footerY = margin;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = usableWidth / 3;

  const createBlock = (
    text: string,
    align: 'left' | 'center' | 'right',
    yPos: number,
    isHeader: boolean
  ): TextBlock => {
    const substituted = substituteTokens(text, pageIndex, totalPages);
    let left = margin;
    if (align === 'center') left = margin + colWidth;
    else if (align === 'right') left = margin + colWidth * 2;

    const bounds: Rect = {
      left,
      bottom: yPos - fontSize * 0.3,
      right: left + colWidth,
      top: yPos + fontSize * 1.0
    };

    const id = `${isHeader ? 'header' : 'footer'}-${pageIndex}-${align}-${Date.now()}`;

    return {
      id,
      pageIndex,
      bounds,
      lines: [
        {
          id: `line-${id}`,
          text: substituted,
          bounds,
          baseline: yPos,
          spans: [
            {
              text: substituted,
              bounds,
              fontName,
              fontSize,
              color
            }
          ]
        }
      ],
      runs: [],
      rotation: 0,
      writingMode: 'horizontal-tb',
      alignment: align,
      primaryFont: fontName,
      primaryFontSize: fontSize,
      primaryColor: color,
      isHeader,
      isFooter: !isHeader,
      fontReusability: {
        canReuseFont: true,
        isSubset: false,
        isEmbedded: true,
        fontName,
        missingGlyphs: [],
        recommendedFallback: 'Roboto-Regular'
      }
    };
  };

  // Build Header
  if (headerSec) {
    if (headerSec.leftText?.trim()) {
      blocks.push(createBlock(headerSec.leftText, 'left', headerY, true));
    }
    if (headerSec.centerText?.trim()) {
      blocks.push(createBlock(headerSec.centerText, 'center', headerY, true));
    }
    if (headerSec.rightText?.trim()) {
      blocks.push(createBlock(headerSec.rightText, 'right', headerY, true));
    }
  }

  // Build Footer
  if (footerSec) {
    if (footerSec.leftText?.trim()) {
      blocks.push(createBlock(footerSec.leftText, 'left', footerY, false));
    }
    if (footerSec.centerText?.trim()) {
      blocks.push(createBlock(footerSec.centerText, 'center', footerY, false));
    }
    if (footerSec.rightText?.trim()) {
      blocks.push(createBlock(footerSec.rightText, 'right', footerY, false));
    }
  }

  return blocks;
}
