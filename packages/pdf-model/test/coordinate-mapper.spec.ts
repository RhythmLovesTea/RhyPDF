import { describe, it, expect } from 'vitest';
import { CoordinateMapper, Rect } from '../src/index';

describe('CoordinateMapper (Task 5.4: PDF ↔ bitmap ↔ CSS px)', () => {
  it('converts standard 0 deg rotation correctly with round-trip', () => {
    const mapper = new CoordinateMapper(595, 842, 0, 1.0, 1.0);
    // PDF origin (0, 0) is bottom-left -> CSS should be (0, 842)
    const p1 = mapper.pdfPointToCss(0, 0);
    expect(p1.x).toBe(0);
    expect(p1.y).toBe(842);

    // PDF top-right (595, 842) -> CSS should be (595, 0)
    const p2 = mapper.pdfPointToCss(595, 842);
    expect(p2.x).toBe(595);
    expect(p2.y).toBe(0);

    // Round-trip css to pdf
    const back1 = mapper.cssPointToPdf(p1.x, p1.y);
    expect(back1.x).toBeCloseTo(0);
    expect(back1.y).toBeCloseTo(0);

    const back2 = mapper.cssPointToPdf(p2.x, p2.y);
    expect(back2.x).toBeCloseTo(595);
    expect(back2.y).toBeCloseTo(842);
  });

  it('converts 90 deg clockwise rotated page correctly with round-trip', () => {
    const mapper = new CoordinateMapper(595, 842, 90, 1.0, 1.0);
    const size = mapper.getCssSize();
    expect(size.width).toBe(842);
    expect(size.height).toBe(595);

    const p = mapper.pdfPointToCss(100, 200);
    expect(p.x).toBe(200);
    expect(p.y).toBe(100);

    const back = mapper.cssPointToPdf(p.x, p.y);
    expect(back.x).toBeCloseTo(100);
    expect(back.y).toBeCloseTo(200);
  });

  it('converts 180 deg upside-down rotated page correctly with round-trip', () => {
    const mapper = new CoordinateMapper(595, 842, 180, 1.0, 1.0);
    const size = mapper.getCssSize();
    expect(size.width).toBe(595);
    expect(size.height).toBe(842);

    const p = mapper.pdfPointToCss(100, 200);
    // x = (595 - 100) = 495, y = 200
    expect(p.x).toBe(495);
    expect(p.y).toBe(200);

    const back = mapper.cssPointToPdf(p.x, p.y);
    expect(back.x).toBeCloseTo(100);
    expect(back.y).toBeCloseTo(200);
  });

  it('converts 270 deg rotated page correctly with round-trip', () => {
    const mapper = new CoordinateMapper(595, 842, 270, 1.0, 1.0);
    const size = mapper.getCssSize();
    expect(size.width).toBe(842);
    expect(size.height).toBe(595);

    const p = mapper.pdfPointToCss(100, 200);
    // x = (842 - 200) = 642, y = (595 - 100) = 495
    expect(p.x).toBe(642);
    expect(p.y).toBe(495);

    const back = mapper.cssPointToPdf(p.x, p.y);
    expect(back.x).toBeCloseTo(100);
    expect(back.y).toBeCloseTo(200);
  });

  it('applies scale and DPR factors to dimensions and points', () => {
    const mapper = new CoordinateMapper(500, 400, 0, 2.0, 1.5);
    const cssSize = mapper.getCssSize();
    expect(cssSize.width).toBe(1000);
    expect(cssSize.height).toBe(800);

    const bitmapSize = mapper.getBitmapSize();
    expect(bitmapSize.width).toBe(1500);
    expect(bitmapSize.height).toBe(1200);

    const pt = mapper.pdfPointToBitmap(100, 100);
    // CSS point at scale 2: x = 200, y = (400 - 100) * 2 = 600
    // Bitmap at DPR 1.5: x = 300, y = 900
    expect(pt.x).toBe(300);
    expect(pt.y).toBe(900);

    const backPdf = mapper.bitmapPointToPdf(pt.x, pt.y);
    expect(backPdf.x).toBeCloseTo(100);
    expect(backPdf.y).toBeCloseTo(100);
  });

  it('converts Rect to CSS BoundingBox and back', () => {
    const mapper = new CoordinateMapper(600, 800, 0, 1.5, 2.0);
    const pdfRect: Rect = { left: 50, bottom: 100, right: 250, top: 300 };

    const cssBox = mapper.pdfRectToCss(pdfRect);
    expect(cssBox.width).toBe((250 - 50) * 1.5);
    expect(cssBox.height).toBe((300 - 100) * 1.5);

    const backPdfRect = mapper.cssRectToPdf(cssBox);
    expect(backPdfRect.left).toBeCloseTo(50);
    expect(backPdfRect.bottom).toBeCloseTo(100);
    expect(backPdfRect.right).toBeCloseTo(250);
    expect(backPdfRect.top).toBeCloseTo(300);
  });

  it('converts Rect to Bitmap BoundingBox and back', () => {
    const mapper = new CoordinateMapper(600, 800, 0, 1.5, 2.0);
    const pdfRect: Rect = { left: 50, bottom: 100, right: 250, top: 300 };

    const bmBox = mapper.pdfRectToBitmap(pdfRect);
    expect(bmBox.width).toBe((250 - 50) * 1.5 * 2.0);
    expect(bmBox.height).toBe((300 - 100) * 1.5 * 2.0);

    const backPdfRect = mapper.bitmapRectToPdf(bmBox);
    expect(backPdfRect.left).toBeCloseTo(50);
    expect(backPdfRect.bottom).toBeCloseTo(100);
    expect(backPdfRect.right).toBeCloseTo(250);
    expect(backPdfRect.top).toBeCloseTo(300);
  });

  it('handles cropBox offsets correctly', () => {
    const cropBox: Rect = { left: 36, bottom: 36, right: 559, top: 806 };
    const mapper = new CoordinateMapper(595, 842, 0, 1.0, 1.0, { cropBox });

    expect(mapper.effectiveWidthPt).toBe(523);
    expect(mapper.effectiveHeightPt).toBe(770);

    // Bottom-left of cropBox (36, 36) -> CSS (0, 770)
    const p1 = mapper.pdfPointToCss(36, 36);
    expect(p1.x).toBe(0);
    expect(p1.y).toBe(770);

    // Top-right of cropBox (559, 806) -> CSS (523, 0)
    const p2 = mapper.pdfPointToCss(559, 806);
    expect(p2.x).toBe(523);
    expect(p2.y).toBe(0);

    const back1 = mapper.cssPointToPdf(0, 770);
    expect(back1.x).toBeCloseTo(36);
    expect(back1.y).toBeCloseTo(36);
  });

  it('handles UserUnit scaling factor (> 1.0)', () => {
    // Large format drawing with UserUnit = 2.0
    const mapper = new CoordinateMapper(500, 500, 0, 1.0, 1.0, { userUnit: 2.0 });

    expect(mapper.effectiveWidthPt).toBe(1000);
    expect(mapper.effectiveHeightPt).toBe(1000);

    const p = mapper.pdfPointToCss(250, 250);
    expect(p.x).toBe(500);
    expect(p.y).toBe(500);

    const back = mapper.cssPointToPdf(500, 500);
    expect(back.x).toBeCloseTo(250);
    expect(back.y).toBeCloseTo(250);
  });

  it('converts CSS points to Bitmap points and back', () => {
    const mapper = new CoordinateMapper(595, 842, 0, 1.0, 2.5);
    const bmPoint = mapper.cssPointToBitmap(100, 200);
    expect(bmPoint.x).toBe(250);
    expect(bmPoint.y).toBe(500);

    const cssPoint = mapper.bitmapPointToCss(bmPoint.x, bmPoint.y);
    expect(cssPoint.x).toBe(100);
    expect(cssPoint.y).toBe(200);
  });
});
