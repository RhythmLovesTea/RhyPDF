import type { TextRun } from '@rhypdf/pdf-model';
import type { FontReusabilityInfo } from './types';

/**
 * Determine the closest bundled standard font to replace non-embedded or missing-glyph fonts.
 */
export function getRecommendedBundledFont(fontName: string): string {
  const lower = fontName.toLowerCase();
  if (lower.includes('courier') || lower.includes('mono') || lower.includes('consolas')) {
    return 'Courier';
  }
  if (
    lower.includes('times') ||
    lower.includes('serif') ||
    lower.includes('georgia') ||
    lower.includes('cambria')
  ) {
    return 'Times-Roman';
  }
  return 'Roboto';
}

/**
 * Extract all unique characters contained in a set of text runs.
 */
export function extractGlyphSetFromRuns(runs: TextRun[]): Set<string> {
  const glyphs = new Set<string>();
  for (const run of runs) {
    if (run.text) {
      for (let i = 0; i < run.text.length; i++) {
        glyphs.add(run.text[i]!);
      }
    }
  }
  return glyphs;
}

/**
 * Detect font embedding status, subset limitations, and missing glyphs.
 * Task 7.4 & 7.12:
 * Detect whether each block's font is embedded-subset, embedded-full or not embedded;
 * store canReuseFont and missingGlyphs.
 */
export function detectFontReusability(
  runs: TextRun[],
  newText?: string,
  primaryFontName?: string
): FontReusabilityInfo {
  if (runs.length === 0) {
    return {
      canReuseFont: true,
      isSubset: false,
      isEmbedded: false,
      fontName: primaryFontName || 'Helvetica',
      missingGlyphs: [],
      recommendedFallback: getRecommendedBundledFont(primaryFontName || 'Helvetica')
    };
  }

  const firstRun = runs[0]!;
  const fontName = primaryFontName || firstRun.fontName || 'Helvetica';
  const info = firstRun.fontInfo;

  // Check if subset tag exists e.g. "ABCDEF+FontName" or flags indicate subset
  const hasSubsetTag = /^[A-Z]{6}\+/.test(fontName);
  const isSubset = Boolean(firstRun.isEmbeddedSubset || info?.isSubset || hasSubsetTag);
  const isEmbedded = Boolean(info?.isEmbedded || isSubset);

  const recommendedFallback = getRecommendedBundledFont(fontName);

  if (!isSubset) {
    // Full font or standard 14 PDF font can reuse all characters
    return {
      canReuseFont: true,
      isSubset: false,
      isEmbedded,
      fontName,
      missingGlyphs: [],
      recommendedFallback
    };
  }

  // If it's a subset font, gather existing glyphs in subset
  const existingGlyphs = extractGlyphSetFromRuns(runs);
  const missingGlyphs: string[] = [];

  if (newText !== undefined) {
    for (let i = 0; i < newText.length; i++) {
      const char = newText[i]!;
      // Space and common control characters are always permitted
      if (char === ' ' || char === '\n' || char === '\t' || char === '\r') continue;
      if (!existingGlyphs.has(char) && !missingGlyphs.includes(char)) {
        missingGlyphs.push(char);
      }
    }
  }

  const canReuseFont = missingGlyphs.length === 0;

  return {
    canReuseFont,
    isSubset: true,
    isEmbedded: true,
    fontName,
    missingGlyphs,
    recommendedFallback
  };
}
