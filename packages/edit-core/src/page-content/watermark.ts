/**
 * @rhypdf/edit-core
 * Task 11.10: Watermark generator (text or image, rotation, opacity, center/tile).
 */

import type { Rect, ColorRGBA, ImageObject } from '@rhypdf/pdf-model';
import type { TextBlock } from '../text/types';
import type { WatermarkConfig } from './types';

export type WatermarkObject = TextBlock | ImageObject;

export function generateWatermarkForPage(
  config: WatermarkConfig,
  pageIndex: number,
  pageWidth: number,
  pageHeight: number
): WatermarkObject[] {
  const objects: WatermarkObject[] = [];
  const opacity = config.opacity ?? 0.25;
  const rotation = config.rotation ?? 45;
  const isTile = Boolean(config.tile);

  if (config.type === 'text') {
    const text = config.text ?? 'CONFIDENTIAL';
    const fontSize = config.fontSize ?? (isTile ? 32 : 54);
    const fontName = config.fontName ?? 'Roboto-Bold';
    const color: ColorRGBA = config.color ?? { r: 148, g: 163, b: 184, a: 255 }; // slate-400

    // Approximate width of text based on character count and font size
    const estWidth = text.length * fontSize * 0.6;
    const estHeight = fontSize * 1.4;

    const positions: { x: number; y: number }[] = [];

    if (isTile) {
      // 3x3 grid
      const colStep = pageWidth / 3;
      const rowStep = pageHeight / 3;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          positions.push({
            x: c * colStep + colStep / 2,
            y: r * rowStep + rowStep / 2
          });
        }
      }
    } else {
      // Single centered watermark
      positions.push({
        x: pageWidth / 2,
        y: pageHeight / 2
      });
    }

    positions.forEach((pos, idx) => {
      const bounds: Rect = {
        left: pos.x - estWidth / 2,
        bottom: pos.y - estHeight / 2,
        right: pos.x + estWidth / 2,
        top: pos.y + estHeight / 2
      };

      const id = `wm-text-${pageIndex}-${idx}-${Date.now()}`;

      const block: TextBlock = {
        id,
        pageIndex,
        bounds,
        lines: [
          {
            id: `line-${id}`,
            text,
            bounds,
            baseline: bounds.bottom + fontSize * 0.3,
            spans: [
              {
                text,
                bounds,
                fontName,
                fontSize,
                color,
                opacity
              }
            ]
          }
        ],
        runs: [],
        rotation,
        writingMode: 'horizontal-tb',
        alignment: 'center',
        primaryFont: fontName,
        primaryFontSize: fontSize,
        primaryColor: color,
        opacity,
        fontReusability: {
          canReuseFont: true,
          isSubset: false,
          isEmbedded: true,
          fontName,
          missingGlyphs: [],
          recommendedFallback: 'Roboto-Regular'
        }
      };

      objects.push(block);
    });
  } else if (config.type === 'image' && config.imageUrl) {
    const imgWidth = config.imageWidth ?? 200;
    const imgHeight = config.imageHeight ?? 150;

    const positions: { x: number; y: number }[] = [];

    if (isTile) {
      const colStep = pageWidth / 2;
      const rowStep = pageHeight / 2;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          positions.push({
            x: c * colStep + colStep / 2,
            y: r * rowStep + rowStep / 2
          });
        }
      }
    } else {
      positions.push({
        x: pageWidth / 2,
        y: pageHeight / 2
      });
    }

    positions.forEach((pos, idx) => {
      const bounds: Rect = {
        left: pos.x - imgWidth / 2,
        bottom: pos.y - imgHeight / 2,
        right: pos.x + imgWidth / 2,
        top: pos.y + imgHeight / 2
      };

      const id = `wm-img-${pageIndex}-${idx}-${Date.now()}`;

      const imgObj: ImageObject = {
        id,
        type: 'image',
        bounds,
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: 15,
        pixelWidth: imgWidth,
        pixelHeight: imgHeight,
        effectiveDpi: { x: 72, y: 72 },
        format: 'png'
      };

      objects.push(imgObj);
    });
  }

  return objects;
}
