import type {
  Rect
} from '@rhypdf/pdf-model';
import type {
  TextDirection,
  ShapedGlyph,
  ShapedRun,
  LayoutGlyphPosition,
  LayoutLine,
  LayoutResult,
  TextLayoutOptions,
  TextLayoutEngine
} from './index';

/**
 * Approximate character width ratio relative to fontSize for standard fonts.
 */
function getApproxCharWidth(char: string, fontSize: number): number {
  const code = char.charCodeAt(0);
  // Spaces
  if (char === ' ') return fontSize * 0.28;
  // CJK and full-width characters
  if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3000 && code <= 0x30ff) || (code >= 0xff00 && code <= 0xffef)) {
    return fontSize * 1.0;
  }
  // Thin characters
  if ('ijl|!:,;.I\'`'.includes(char)) {
    return fontSize * 0.28;
  }
  // Wide characters
  if ('mwMW@%#&'.includes(char)) {
    return fontSize * 0.8;
  }
  // Standard capitals
  if (code >= 65 && code <= 90) {
    return fontSize * 0.65;
  }
  // Standard lowercase & digits
  return fontSize * 0.52;
}

/**
 * Measure text width using canvas if available, or approximate character widths.
 */
export function measureTextWidth(text: string, fontSize: number, letterSpacing = 0): number {
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${fontSize}px sans-serif`;
        const measured = ctx.measureText(text).width;
        if (measured > 0) {
          return measured + (text.length > 1 ? (text.length - 1) * letterSpacing : 0);
        }
      }
    } catch {
      // Fallback to heuristic
    }
  }

  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += getApproxCharWidth(text[i]!, fontSize) + letterSpacing;
  }
  return width;
}

/**
 * SimpleTextLayoutEngine
 * Production-ready text layout and word-wrapping engine for in-place PDF text editing.
 */
export class SimpleTextLayoutEngine implements TextLayoutEngine {
  async shape(text: string, _fontData: Uint8Array, direction: TextDirection = 'ltr'): Promise<ShapedRun> {
    const glyphs: ShapedGlyph[] = [];
    let totalAdvance = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i]!;
      const advance = getApproxCharWidth(char, 12);
      glyphs.push({
        glyphId: char.charCodeAt(0),
        cluster: i,
        xAdvance: advance,
        yAdvance: 0,
        xOffset: 0,
        yOffset: 0
      });
      totalAdvance += advance;
    }

    return {
      direction,
      script: 'Latn',
      glyphs,
      totalAdvance
    };
  }

  async layout(text: string, options: TextLayoutOptions): Promise<LayoutResult> {
    const fontSize = options.fontSize || 12;
    const lineHeightRatio = options.lineHeight || 1.25;
    const lineHeight = fontSize * lineHeightRatio;
    const maxWidth = options.maxWidth && options.maxWidth > 0 ? options.maxWidth : Infinity;
    const letterSpacing = options.letterSpacing || 0;
    const textAlign = options.textAlign || 'left';

    const ascent = fontSize * 0.8;
    const descent = fontSize * 0.2;

    const lines: LayoutLine[] = [];
    // Split by hard line breaks
    const rawParagraphs = text.split('\n');

    let currentY = 0;
    let maxLineWidth = 0;

    for (const paragraph of rawParagraphs) {
      if (paragraph.length === 0) {
        // Empty blank line
        lines.push({
          text: '',
          bounds: { left: 0, bottom: currentY - descent, right: 0, top: currentY + ascent },
          ascent,
          descent,
          glyphs: []
        });
        currentY += lineHeight;
        continue;
      }

      // Word wrapping inside paragraph
      const words = paragraph.split(' ');
      let currentLineWords: string[] = [];
      let currentLineWidth = 0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i]!;
        const wordWidth = measureTextWidth(word, fontSize, letterSpacing);
        const spaceWidth = measureTextWidth(' ', fontSize, letterSpacing);

        const proposedWidth = currentLineWords.length === 0
          ? wordWidth
          : currentLineWidth + spaceWidth + wordWidth;

        if (proposedWidth <= maxWidth || currentLineWords.length === 0) {
          currentLineWords.push(word);
          currentLineWidth = proposedWidth;
        } else {
          // Commit line
          const lineText = currentLineWords.join(' ');
          lines.push(
            this.buildLine(lineText, currentLineWidth, maxWidth, currentY, ascent, descent, fontSize, letterSpacing, textAlign)
          );
          maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
          currentY += lineHeight;

          currentLineWords = [word];
          currentLineWidth = wordWidth;
        }
      }

      if (currentLineWords.length > 0) {
        const lineText = currentLineWords.join(' ');
        lines.push(
          this.buildLine(lineText, currentLineWidth, maxWidth, currentY, ascent, descent, fontSize, letterSpacing, textAlign)
        );
        maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
        currentY += lineHeight;
      }
    }

    const totalHeight = lines.length * lineHeight;

    return {
      lines,
      width: Math.min(maxWidth === Infinity ? maxLineWidth : maxWidth, maxLineWidth),
      height: totalHeight
    };
  }

  private buildLine(
    lineText: string,
    lineWidth: number,
    maxWidth: number,
    y: number,
    ascent: number,
    descent: number,
    fontSize: number,
    letterSpacing: number,
    textAlign: 'left' | 'center' | 'right' | 'justify'
  ): LayoutLine {
    let startX = 0;
    const availableWidth = maxWidth !== Infinity ? maxWidth : lineWidth;

    if (textAlign === 'center') {
      startX = Math.max(0, (availableWidth - lineWidth) / 2);
    } else if (textAlign === 'right') {
      startX = Math.max(0, availableWidth - lineWidth);
    }

    const glyphs: LayoutGlyphPosition[] = [];
    let curX = startX;

    for (let j = 0; j < lineText.length; j++) {
      const char = lineText[j]!;
      const charW = getApproxCharWidth(char, fontSize) + letterSpacing;
      glyphs.push({
        glyphId: char.charCodeAt(0),
        x: curX,
        y: y + ascent,
        width: charW,
        height: fontSize
      });
      curX += charW;
    }

    const bounds: Rect = {
      left: startX,
      bottom: y,
      right: curX,
      top: y + ascent + descent
    };

    return {
      text: lineText,
      bounds,
      ascent,
      descent,
      glyphs
    };
  }

  /**
   * Shrink-to-fit calculation: iteratively scales down font size
   * so the wrapped text fits within targetHeight.
   */
  async calculateShrinkToFit(
    text: string,
    options: TextLayoutOptions,
    targetHeight: number,
    minFontSize = 6
  ): Promise<{ fontSize: number; layout: LayoutResult }> {
    let currentSize = options.fontSize;
    let result = await this.layout(text, { ...options, fontSize: currentSize });

    while (result.height > targetHeight && currentSize > minFontSize) {
      currentSize = Math.max(minFontSize, currentSize - 0.5);
      result = await this.layout(text, { ...options, fontSize: currentSize });
    }

    return { fontSize: currentSize, layout: result };
  }
}
