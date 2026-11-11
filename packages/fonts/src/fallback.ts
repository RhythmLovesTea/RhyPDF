/**
 * @rhypdf/fonts - Script Detection & Automatic Fallback Chains
 * Detects Unicode scripts and maps character runs to appropriate font fallback chains
 * (e.g. Latin font + Noto Arabic when Arabic is typed into a Latin block).
 * Task 8.17.
 */

import { FontCatalog, type FontCatalogEntry } from './catalog';

export type UnicodeScript =
  | 'latin'
  | 'arabic'
  | 'hebrew'
  | 'devanagari'
  | 'bengali'
  | 'gurmukhi'
  | 'gujarati'
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'thai'
  | 'cjk'
  | 'cyrillic'
  | 'greek'
  | 'common';

export interface TextScriptSegment {
  text: string;
  script: UnicodeScript;
  fontFamily: string;
  isFallback: boolean;
}

/**
 * Classify a Unicode code point into its script category
 */
export function classifyCodePoint(cp: number): UnicodeScript {
  // Common symbols, punctuation, spaces, numbers
  if (
    cp <= 0x0040 || // Space, digits, ASCII symbols
    (cp >= 0x005b && cp <= 0x0060) ||
    (cp >= 0x007b && cp <= 0x007f) ||
    (cp >= 0x2000 && cp <= 0x206f) // General punctuation
  ) {
    return 'common';
  }

  // Latin
  if (
    (cp >= 0x0041 && cp <= 0x005a) ||
    (cp >= 0x0061 && cp <= 0x007a) ||
    (cp >= 0x00c0 && cp <= 0x024f) ||
    (cp >= 0x1e00 && cp <= 0x1eff)
  ) {
    return 'latin';
  }

  // Cyrillic
  if (cp >= 0x0400 && cp <= 0x04ff) {
    return 'cyrillic';
  }

  // Greek
  if (cp >= 0x0370 && cp <= 0x03ff) {
    return 'greek';
  }

  // Arabic
  if (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  ) {
    return 'arabic';
  }

  // Hebrew
  if ((cp >= 0x0590 && cp <= 0x05ff) || (cp >= 0xfb1d && cp <= 0xfb4f)) {
    return 'hebrew';
  }

  // Devanagari (Hindi)
  if (cp >= 0x0900 && cp <= 0x097f) {
    return 'devanagari';
  }

  // Bengali
  if (cp >= 0x0980 && cp <= 0x09ff) {
    return 'bengali';
  }

  // Gurmukhi (Punjabi)
  if (cp >= 0x0a00 && cp <= 0x0a7f) {
    return 'gurmukhi';
  }

  // Gujarati
  if (cp >= 0x0a80 && cp <= 0x0aff) {
    return 'gujarati';
  }

  // Tamil
  if (cp >= 0x0b80 && cp <= 0x0bff) {
    return 'tamil';
  }

  // Telugu
  if (cp >= 0x0c00 && cp <= 0x0c7f) {
    return 'telugu';
  }

  // Kannada
  if (cp >= 0x0c80 && cp <= 0x0cff) {
    return 'kannada';
  }

  // Malayalam
  if (cp >= 0x0d00 && cp <= 0x0d7f) {
    return 'malayalam';
  }

  // Thai
  if (cp >= 0x0e00 && cp <= 0x0e7f) {
    return 'thai';
  }

  // CJK (Chinese, Japanese, Korean)
  if (
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x3040 && cp <= 0x309f) || // Hiragana
    (cp >= 0x30a0 && cp <= 0x30ff) || // Katakana
    (cp >= 0xac00 && cp <= 0xd7af) // Hangul
  ) {
    return 'cjk';
  }

  return 'common';
}

/**
 * Get the recommended fallback font family name for a given Unicode script
 */
export function getRecommendedFamilyForScript(script: UnicodeScript): string {
  switch (script) {
    case 'arabic':
      return 'Noto Sans Arabic';
    case 'hebrew':
      return 'Noto Sans Hebrew';
    case 'devanagari':
      return 'Noto Sans Devanagari';
    case 'bengali':
      return 'Noto Sans Bengali';
    case 'tamil':
      return 'Noto Sans Tamil';
    case 'telugu':
      return 'Noto Sans Telugu';
    case 'kannada':
      return 'Noto Sans Kannada';
    case 'malayalam':
      return 'Noto Sans Malayalam';
    case 'gujarati':
      return 'Noto Sans Gujarati';
    case 'gurmukhi':
      return 'Noto Sans Gurmukhi';
    case 'thai':
      return 'Noto Sans Thai';
    case 'cjk':
      return 'Noto Sans CJK SC';
    case 'cyrillic':
    case 'greek':
    case 'latin':
    default:
      return 'Roboto';
  }
}

/**
 * Checks if a catalog font supports a given script
 */
export function doesFontSupportScript(font: FontCatalogEntry, script: UnicodeScript): boolean {
  if (script === 'common') return true;
  return font.supportedScripts.some((s) => s.toLowerCase() === script.toLowerCase());
}

/**
 * Task 8.17: Split text into script segments with automatic per-script fallback fonts
 */
export function splitTextIntoScriptSegments(
  text: string,
  primaryFamilyName: string
): TextScriptSegment[] {
  if (!text) return [];

  const catalog = FontCatalog.getInstance();
  const primaryEntry = catalog.getByFamily(primaryFamilyName);

  const segments: TextScriptSegment[] = [];
  let currentText = '';
  let currentScript: UnicodeScript = 'common';
  let currentFamily = primaryFamilyName;
  let isCurrentFallback = false;

  for (const char of text) {
    const cp = char.codePointAt(0)!;
    const charScript = classifyCodePoint(cp);

    // Common characters (spaces, punctuation, digits) attach to the current segment
    if (charScript === 'common') {
      currentText += char;
      continue;
    }

    // Check if primary font supports this character's script
    const primarySupports = primaryEntry
      ? doesFontSupportScript(primaryEntry, charScript)
      : charScript === 'latin';

    const targetFamily = primarySupports
      ? primaryFamilyName
      : getRecommendedFamilyForScript(charScript);
    const isFallback = !primarySupports;

    if (currentText.length === 0) {
      currentText = char;
      currentScript = charScript;
      currentFamily = targetFamily;
      isCurrentFallback = isFallback;
    } else if (targetFamily === currentFamily) {
      currentText += char;
      if (currentScript === 'common') {
        currentScript = charScript;
      }
    } else {
      // Script or font changed - flush segment
      segments.push({
        text: currentText,
        script: currentScript,
        fontFamily: currentFamily,
        isFallback: isCurrentFallback
      });
      currentText = char;
      currentScript = charScript;
      currentFamily = targetFamily;
      isCurrentFallback = isFallback;
    }
  }

  if (currentText.length > 0) {
    segments.push({
      text: currentText,
      script: currentScript,
      fontFamily: currentFamily,
      isFallback: isCurrentFallback
    });
  }

  return segments;
}
