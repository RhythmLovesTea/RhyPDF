import type { Rect } from '@rhypdf/pdf-model';
import type {
  TextDirection,
  ShapedRun,
  LayoutGlyphPosition,
  LayoutLine,
  LayoutResult,
  TextLayoutOptions,
  TextLayoutEngine
} from './index';
import { TextShaper } from './shaper';
import { BidiEngine, determineBaseDirection } from './bidi';
import { ThaiEngine } from './thai';
import { CjkEngine, isCjkCodePoint } from './cjk';

const bidiEngine = new BidiEngine();
const thaiEngine = new ThaiEngine();
const cjkEngine = new CjkEngine();
const shaper = TextShaper.getInstance();

/**
 * Approximate character width ratio relative to fontSize for standard fonts.
 */
function getApproxCharWidth(char: string, fontSize: number): number {
  const code = char.codePointAt(0)!;
  // Spaces
  if (char === ' ') return fontSize * 0.28;
  // CJK and full-width characters
  if (isCjkCodePoint(code)) {
    return fontSize * 1.0;
  }
  // Thin characters
  if ("ijl|!:,;.I'`".includes(char)) {
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
 * Production-ready text layout, word-wrapping, and multi-language engine.
 */
export class SimpleTextLayoutEngine implements TextLayoutEngine {
  async shape(text: string, fontData?: Uint8Array, direction?: TextDirection): Promise<ShapedRun> {
    return shaper.shape(text, fontData, { direction });
  }

  async layout(text: string, options: TextLayoutOptions): Promise<LayoutResult> {
    const fontSize = options.fontSize || 12;
    const lineHeightRatio = options.lineHeight || 1.25;
    const lineHeight = fontSize * lineHeightRatio;
    const maxWidth = options.maxWidth && options.maxWidth > 0 ? options.maxWidth : Infinity;
    const letterSpacing = options.letterSpacing || 0;

    const ascent = fontSize * 0.8;
    const descent = fontSize * 0.2;

    const lines: LayoutLine[] = [];
    const rawParagraphs = text.split('\n');

    let currentY = 0;
    let maxLineWidth = 0;

    for (const paragraph of rawParagraphs) {
      if (paragraph.length === 0) {
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

      // Detect base direction
      const baseDir = determineBaseDirection(paragraph);
      const effectiveAlign = options.textAlign || (baseDir === 'rtl' ? 'right' : 'left');

      // Check if paragraph contains Thai (no-space words)
      const hasThai = thaiEngine.hasThai(paragraph);
      // Check if paragraph contains CJK
      const hasCjk = cjkEngine.hasCjk(paragraph);

      let paragraphTokens: string[];
      if (hasThai) {
        // Use Thai word segmentation
        const thaiWords = thaiEngine.segmentWords(paragraph);
        paragraphTokens = thaiWords.map((w) => w.text);
      } else if (hasCjk && maxWidth !== Infinity) {
        // Wrap CJK with Kinsoku rules
        const approxChars = Math.max(1, Math.floor(maxWidth / fontSize));
        const kinsokuResult = cjkEngine.wrapCjkLines(paragraph, approxChars);
        paragraphTokens = kinsokuResult.lines;
      } else {
        // Standard space-separated words
        paragraphTokens = paragraph.split(' ');
      }

      let currentLineWords: string[] = [];
      let currentLineWidth = 0;

      for (let i = 0; i < paragraphTokens.length; i++) {
        const token = paragraphTokens[i]!;
        const tokenWidth = measureTextWidth(token, fontSize, letterSpacing);
        const separator = hasThai || hasCjk ? '' : ' ';
        const sepWidth = separator ? measureTextWidth(separator, fontSize, letterSpacing) : 0;

        const proposedWidth =
          currentLineWords.length === 0 ? tokenWidth : currentLineWidth + sepWidth + tokenWidth;

        if (proposedWidth <= maxWidth || currentLineWords.length === 0) {
          currentLineWords.push(token);
          currentLineWidth = proposedWidth;
        } else {
          // Line full, emit line
          const lineStr = currentLineWords.join(separator);
          const bidiRes = bidiEngine.resolve(lineStr, baseDir);

          lines.push(
            this.buildLine(
              lineStr,
              bidiRes.visualText,
              currentLineWidth,
              maxWidth,
              currentY,
              ascent,
              descent,
              fontSize,
              letterSpacing,
              effectiveAlign
            )
          );
          maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
          currentY += lineHeight;

          currentLineWords = [token];
          currentLineWidth = tokenWidth;
        }
      }

      if (currentLineWords.length > 0) {
        const separator = hasThai || hasCjk ? '' : ' ';
        const lineStr = currentLineWords.join(separator);
        const bidiRes = bidiEngine.resolve(lineStr, baseDir);

        lines.push(
          this.buildLine(
            lineStr,
            bidiRes.visualText,
            currentLineWidth,
            maxWidth,
            currentY,
            ascent,
            descent,
            fontSize,
            letterSpacing,
            effectiveAlign
          )
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
    logicalText: string,
    visualText: string,
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

    for (let j = 0; j < visualText.length; j++) {
      const char = visualText[j]!;
      const charW = getApproxCharWidth(char, fontSize) + letterSpacing;
      glyphs.push({
        glyphId: char.codePointAt(0) || char.charCodeAt(0),
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
      text: logicalText,
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
