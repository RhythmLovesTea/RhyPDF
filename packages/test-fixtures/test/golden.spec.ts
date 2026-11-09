import { describe, it, expect } from 'vitest';
import { comparePixels, comparePngBuffers, createSyntheticPng } from '../src/golden';
import { SAMPLE_FIXTURES } from '../src/index';

describe('packages/test-fixtures: golden image helper and fixtures', () => {
  it('identifies identical pixel buffers with zero diff', () => {
    const width = 10;
    const height = 10;
    const data1 = new Uint8Array(width * height * 4).fill(255);
    const data2 = new Uint8Array(width * height * 4).fill(255);

    const result = comparePixels(data1, data2, width, height);
    expect(result.matched).toBe(true);
    expect(result.diffPixels).toBe(0);
    expect(result.diffPercentage).toBe(0);
    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
  });

  it('detects mismatched pixels and produces diff buffer', () => {
    const width = 10;
    const height = 10;
    const data1 = new Uint8Array(width * height * 4).fill(255);
    const data2 = new Uint8Array(width * height * 4).fill(255);

    // Modify 5 pixels (20 values) to black
    for (let i = 0; i < 20; i++) {
      data2[i] = 0;
    }

    const result = comparePixels(data1, data2, width, height, { maxDiffPixels: 0 });
    expect(result.matched).toBe(false);
    expect(result.diffPixels).toBe(5);
    expect(result.diffPercentage).toBe(5); // 5 out of 100 pixels = 5%
    expect(result.diffPngBuffer).toBeDefined();
    expect(result.diffPngBuffer!.length).toBeGreaterThan(0);
  });

  it('compares encoded PNG buffers accurately', () => {
    const png1 = createSyntheticPng(20, 20, [100, 150, 200, 255]);
    const png2 = createSyntheticPng(20, 20, [100, 150, 200, 255]);

    const result = comparePngBuffers(png1, png2);
    expect(result.matched).toBe(true);
    expect(result.diffPixels).toBe(0);
  });

  it('throws on mismatched image dimensions', () => {
    const png1 = createSyntheticPng(20, 20);
    const png2 = createSyntheticPng(30, 20);

    expect(() => comparePngBuffers(png1, png2)).toThrow(/dimensions do not match/);
  });

  it('provides a catalog of all 14 sample fixtures', () => {
    expect(Object.keys(SAMPLE_FIXTURES).length).toBe(14);
    expect(SAMPLE_FIXTURES['01_text_single_column']).toBeDefined();
    expect(SAMPLE_FIXTURES['06_complex_shaped']).toBeDefined();
  });
});
