import { describe, it, expect } from 'vitest';
import { SimpleTextLayoutEngine, measureTextWidth } from '../src/index';

describe('TextLayoutEngine', () => {
  const engine = new SimpleTextLayoutEngine();

  it('measures text widths appropriately for regular characters and spaces', () => {
    const widthLatin = measureTextWidth('Hello World', 14);
    expect(widthLatin).toBeGreaterThan(0);

    const widthThin = measureTextWidth('iii', 14);
    const widthWide = measureTextWidth('MMM', 14);
    expect(widthWide).toBeGreaterThan(widthThin);
  });

  it('lays out single line of text with bounds and glyph positions', async () => {
    const result = await engine.layout('Simple text layout', {
      fontSize: 14,
      maxWidth: 500
    });

    expect(result.lines.length).toBe(1);
    expect(result.lines[0]!.text).toBe('Simple text layout');
    expect(result.lines[0]!.glyphs.length).toBe('Simple text layout'.length);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('wraps text onto multiple lines when exceeding maxWidth', async () => {
    const text = 'This is a long sentence that should definitely wrap across multiple lines when given a narrow maximum width constraint.';
    const result = await engine.layout(text, {
      fontSize: 12,
      maxWidth: 120
    });

    expect(result.lines.length).toBeGreaterThan(1);
    for (const line of result.lines) {
      expect(line.bounds.right - line.bounds.left).toBeLessThanOrEqual(130); // within tolerance
    }
  });

  it('handles explicit newlines and blank lines', async () => {
    const text = 'Line 1\n\nLine 3';
    const result = await engine.layout(text, {
      fontSize: 12
    });

    expect(result.lines.length).toBe(3);
    expect(result.lines[0]!.text).toBe('Line 1');
    expect(result.lines[1]!.text).toBe('');
    expect(result.lines[2]!.text).toBe('Line 3');
  });

  it('calculates shrink-to-fit properly to fit within target height', async () => {
    const text = 'Paragraph line one.\nParagraph line two.\nParagraph line three.\nParagraph line four.';
    const initialOptions = { fontSize: 20, maxWidth: 300, lineHeight: 1.25 };
    const targetHeight = 40; // Only allows ~1-2 lines at 20pt

    const { fontSize, layout } = await engine.calculateShrinkToFit(text, initialOptions, targetHeight, 8);
    expect(fontSize).toBeLessThan(20);
    expect(layout.height).toBeLessThanOrEqual(targetHeight + 5);
  });

  it('shapes text and returns shaped runs', async () => {
    const shaped = await engine.shape('Test shaping', new Uint8Array(0), 'ltr');
    expect(shaped.direction).toBe('ltr');
    expect(shaped.glyphs.length).toBe('Test shaping'.length);
    expect(shaped.totalAdvance).toBeGreaterThan(0);
  });
});
