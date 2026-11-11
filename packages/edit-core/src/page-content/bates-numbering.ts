/**
 * @rhypdf/edit-core
 * Task 11.9: Page numbers and Bates numbering generator.
 */

import type { Rect, ColorRGBA } from '@rhypdf/pdf-model';
import type { TextBlock } from '../text/types';
import type { BatesNumberingConfig, BatesPosition } from './types';

/**
 * Formats a Bates number string from configuration: prefix + padded digits + suffix.
 */
export function formatBatesNumber(sequenceNum: number, config: BatesNumberingConfig): string {
  const prefix = config.prefix ?? '';
  const suffix = config.suffix ?? '';
  const numDigits = config.numDigits ?? 6;
  const startNum = config.startNumber ?? 1;

  const currentNum = startNum + sequenceNum;
  const padded = String(Math.max(0, currentNum)).padStart(numDigits, '0');

  return `${prefix}${padded}${suffix}`;
}

/**
 * Generates a TextBlock for a single page's Bates number.
 */
export function generateBatesBlock(
  config: BatesNumberingConfig,
  pageIndex: number,
  sequenceNum: number,
  pageWidth: number,
  pageHeight: number
): TextBlock {
  const text = formatBatesNumber(sequenceNum, config);
  const position: BatesPosition = config.position ?? 'bottomRight';
  const margin = config.margin ?? 36;
  const fontSize = config.fontSize ?? 10;
  const fontName = config.fontName ?? 'Roboto-Regular';
  const color: ColorRGBA = config.color ?? { r: 15, g: 23, b: 42, a: 255 };

  const boxWidth = 140;
  const boxHeight = fontSize * 1.5;

  let left = margin;
  let bottom = margin;
  let align: 'left' | 'center' | 'right' = 'left';

  switch (position) {
    case 'topLeft':
      left = margin;
      bottom = pageHeight - margin - boxHeight;
      align = 'left';
      break;
    case 'topCenter':
      left = (pageWidth - boxWidth) / 2;
      bottom = pageHeight - margin - boxHeight;
      align = 'center';
      break;
    case 'topRight':
      left = pageWidth - margin - boxWidth;
      bottom = pageHeight - margin - boxHeight;
      align = 'right';
      break;
    case 'bottomLeft':
      left = margin;
      bottom = margin;
      align = 'left';
      break;
    case 'bottomCenter':
      left = (pageWidth - boxWidth) / 2;
      bottom = margin;
      align = 'center';
      break;
    case 'bottomRight':
    default:
      left = pageWidth - margin - boxWidth;
      bottom = margin;
      align = 'right';
      break;
  }

  const bounds: Rect = {
    left,
    bottom,
    right: left + boxWidth,
    top: bottom + boxHeight
  };

  const id = `bates-${pageIndex}-${Date.now()}`;

  return {
    id,
    pageIndex,
    bounds,
    lines: [
      {
        id: `line-${id}`,
        text,
        bounds,
        baseline: bottom + fontSize * 0.3,
        spans: [
          {
            text,
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
    fontReusability: {
      canReuseFont: true,
      isSubset: false,
      isEmbedded: true,
      fontName,
      missingGlyphs: [],
      recommendedFallback: 'Roboto-Regular'
    }
  };
}
