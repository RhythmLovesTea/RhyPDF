import { describe, it, expect } from 'vitest';
import { CoordinateMapper } from '../src/index';

describe('CoordinateMapper', () => {
  it('converts standard 0 deg rotation correctly', () => {
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
  });

  it('converts 90 deg clockwise rotated page correctly', () => {
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

  it('applies scale and DPR factors to dimensions', () => {
    const mapper = new CoordinateMapper(500, 400, 0, 2.0, 1.5);
    const cssSize = mapper.getCssSize();
    expect(cssSize.width).toBe(1000);
    expect(cssSize.height).toBe(800);

    const bitmapSize = mapper.getBitmapSize();
    expect(bitmapSize.width).toBe(1500);
    expect(bitmapSize.height).toBe(1200);
  });
});
