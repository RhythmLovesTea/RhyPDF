import { describe, it, expect } from 'vitest';
import {
  createBlankPdfBytes,
  getPageDimensions,
  convertToPoints,
  convertFromPoints
} from '../../src/lib/blankPdf';

describe('Task 4.5: Create blank PDF (A4 / Letter / Legal / custom, orientation)', () => {
  it('converts units to points and back accurately', () => {
    // 1 inch = 72 pt
    expect(convertToPoints(1, 'in')).toBe(72);
    expect(convertFromPoints(72, 'in')).toBe(1);

    // 25.4 mm = 72 pt
    expect(Math.round(convertToPoints(25.4, 'mm'))).toBe(72);
    expect(Math.round(convertFromPoints(72, 'mm') * 10) / 10).toBe(25.4);

    // 96 px = 72 pt
    expect(convertToPoints(96, 'px')).toBe(72);
    expect(convertFromPoints(72, 'px')).toBe(96);
  });

  it('calculates correct dimensions for A4 portrait and landscape', () => {
    const portrait = getPageDimensions({ pageSize: 'A4', orientation: 'portrait' });
    expect(portrait.width).toBe(595.28);
    expect(portrait.height).toBe(841.89);

    const landscape = getPageDimensions({ pageSize: 'A4', orientation: 'landscape' });
    expect(landscape.width).toBe(841.89);
    expect(landscape.height).toBe(595.28);
  });

  it('calculates correct dimensions for Letter and Legal', () => {
    const letter = getPageDimensions({ pageSize: 'Letter', orientation: 'portrait' });
    expect(letter.width).toBe(612);
    expect(letter.height).toBe(792);

    const legal = getPageDimensions({ pageSize: 'Legal', orientation: 'portrait' });
    expect(legal.width).toBe(612);
    expect(legal.height).toBe(1008);
  });

  it('calculates custom dimensions with unit conversions', () => {
    const customInches = getPageDimensions({
      pageSize: 'Custom',
      customWidth: 10,
      customHeight: 12,
      unit: 'in',
      orientation: 'portrait'
    });
    expect(customInches.width).toBe(720);
    expect(customInches.height).toBe(864);
  });

  it('generates valid PDF 1.4 binary bytes with standard objects and xref table', () => {
    const bytes = createBlankPdfBytes({
      pageSize: 'A4',
      orientation: 'portrait',
      pageCount: 1
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBeGreaterThan(100);

    const decoder = new TextDecoder();
    const pdfText = decoder.decode(bytes);

    // PDF header
    expect(pdfText.startsWith('%PDF-1.4')).toBe(true);

    // Objects
    expect(pdfText).toContain('/Type /Catalog');
    expect(pdfText).toContain('/Type /Pages');
    expect(pdfText).toContain('/Type /Page');
    expect(pdfText).toContain('/MediaBox [0 0 595.28 841.89]');
    expect(pdfText).toContain('/Length 0');
    expect(pdfText).toContain('stream\n\nendstream');

    // XRef and Trailer
    expect(pdfText).toContain('xref');
    expect(pdfText).toContain('trailer');
    expect(pdfText).toContain('/Root 1 0 R');
    expect(pdfText).toContain('startxref');
    expect(pdfText.trim().endsWith('%%EOF')).toBe(true);
  });

  it('generates multi-page blank PDF documents correctly', () => {
    const bytes = createBlankPdfBytes({
      pageSize: 'Letter',
      orientation: 'landscape',
      pageCount: 3
    });

    const pdfText = new TextDecoder().decode(bytes);
    expect(pdfText).toContain('/Count 3');
    expect(pdfText).toContain('/MediaBox [0 0 792 612]');

    // Expect 3 page objects
    const pageMatches = pdfText.match(/\/Type \/Page\b/g);
    expect(pageMatches?.length).toBe(3);
  });
});
