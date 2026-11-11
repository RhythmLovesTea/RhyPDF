/**
 * @rhypdf/edit-core
 * Task 11.12: Format Painter.
 * Copies typography and styling attributes from a source TextBlock and applies them to targets.
 */

import type { ColorRGBA } from '@rhypdf/pdf-model';
import type { TextBlock } from './types';

export interface TextStyleAttributes {
  fontName: string;
  fontSize: number;
  color: ColorRGBA;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  isSuperscript?: boolean;
  isSubscript?: boolean;
  opacity?: number;
  highlightColor?: ColorRGBA | null;
  lineSpacing?: number;
  letterSpacing?: number;
  paragraphSpacing?: number;
}

/**
 * Extracts typography and visual styling from a TextBlock.
 */
export function extractTextStyle(block: TextBlock): TextStyleAttributes {
  return {
    fontName: block.primaryFont,
    fontSize: block.primaryFontSize,
    color: { ...block.primaryColor },
    alignment: block.alignment,
    isBold: block.isBold,
    isItalic: block.isItalic,
    isUnderline: block.isUnderline,
    isStrikethrough: block.isStrikethrough,
    isSuperscript: block.isSuperscript,
    isSubscript: block.isSubscript,
    opacity: block.opacity,
    highlightColor: block.highlightColor ? { ...block.highlightColor } : null,
    lineSpacing: block.lineSpacing,
    letterSpacing: block.letterSpacing,
    paragraphSpacing: block.paragraphSpacing
  };
}

/**
 * Applies TextStyleAttributes to a target TextBlock, updating its top-level properties
 * and propagating to its internal lines and spans.
 */
export function applyTextStyleToBlock(target: TextBlock, style: TextStyleAttributes): TextBlock {
  const updated: TextBlock = {
    ...target,
    primaryFont: style.fontName,
    primaryFontSize: style.fontSize,
    primaryColor: { ...style.color },
    alignment: style.alignment ?? target.alignment,
    isBold: style.isBold,
    isItalic: style.isItalic,
    isUnderline: style.isUnderline,
    isStrikethrough: style.isStrikethrough,
    isSuperscript: style.isSuperscript,
    isSubscript: style.isSubscript,
    opacity: style.opacity ?? target.opacity,
    highlightColor: style.highlightColor ? { ...style.highlightColor } : target.highlightColor,
    lineSpacing: style.lineSpacing ?? target.lineSpacing,
    letterSpacing: style.letterSpacing ?? target.letterSpacing,
    paragraphSpacing: style.paragraphSpacing ?? target.paragraphSpacing,
    lines: target.lines.map((line) => ({
      ...line,
      spans: line.spans.map((span) => ({
        ...span,
        fontName: style.fontName,
        fontSize: style.fontSize,
        color: { ...style.color },
        isBold: style.isBold,
        isItalic: style.isItalic,
        isUnderline: style.isUnderline,
        isStrikethrough: style.isStrikethrough,
        isSuperscript: style.isSuperscript,
        isSubscript: style.isSubscript,
        opacity: style.opacity ?? span.opacity
      }))
    }))
  };

  return updated;
}
