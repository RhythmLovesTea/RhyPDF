import type { Rect } from '@rhypdf/pdf-model';
import type { EffectiveDpiResult } from './types';

/**
 * Calculates effective resolution in dots-per-inch (DPI) for an image object.
 * In PDF, 1 pt = 1/72 inch.
 * Therefore, effective DPI = (pixel dimension * 72) / dimension in PDF points.
 */
export function calculateEffectiveDpi(
  pixelWidth: number,
  pixelHeight: number,
  bounds: Rect
): EffectiveDpiResult {
  const widthPt = Math.abs(bounds.right - bounds.left);
  const heightPt = Math.abs(bounds.top - bounds.bottom);

  if (widthPt <= 0 || heightPt <= 0 || pixelWidth <= 0 || pixelHeight <= 0) {
    return {
      dpiX: 72,
      dpiY: 72,
      minDpi: 72,
      isLowRes: true
    };
  }

  const dpiX = Math.round((pixelWidth * 72) / widthPt);
  const dpiY = Math.round((pixelHeight * 72) / heightPt);
  const minDpi = Math.min(dpiX, dpiY);

  return {
    dpiX,
    dpiY,
    minDpi,
    isLowRes: minDpi < 150
  };
}

export type UnitType = 'pt' | 'px' | 'mm' | 'in';

/**
 * Converts PDF points to other measurement units.
 */
export function convertPtToUnit(pt: number, unit: UnitType): number {
  switch (unit) {
    case 'in':
      return Math.round((pt / 72) * 100) / 100;
    case 'mm':
      return Math.round(pt * 0.352778 * 10) / 10;
    case 'px':
      return Math.round(pt * (96 / 72));
    case 'pt':
    default:
      return Math.round(pt * 10) / 10;
  }
}

/**
 * Checks whether an image covers a significant portion of the page
 * (e.g. >= 80% area), identifying background images or full-page scans.
 */
export function isLargePageImage(
  bounds: Rect,
  pageSize: { width: number; height: number },
  thresholdRatio = 0.8
): boolean {
  const imgWidth = Math.abs(bounds.right - bounds.left);
  const imgHeight = Math.abs(bounds.top - bounds.bottom);
  const imgArea = imgWidth * imgHeight;
  const pageArea = pageSize.width * pageSize.height;

  if (pageArea <= 0) return false;
  return imgArea / pageArea >= thresholdRatio;
}
