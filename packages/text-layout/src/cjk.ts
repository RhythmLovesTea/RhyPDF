/**
 * @rhypdf/text-layout - CJK Layout & Kinsoku Engine (Task 9.7)
 * Handles Chinese, Japanese, and Korean horizontal and vertical-rl layout,
 * Kinsoku Shori line-breaking rules (JIS X 4051 / UAX #14), and full-width punctuation.
 */

export type CjkWritingMode = 'horizontal-tb' | 'vertical-rl';

export interface CjkLineWrapResult {
  lines: string[];
  kinsokuAppliedCount: number;
}

/**
 * Characters that must NOT begin a line (Kinsoku Head / 不行頭文字).
 */
export const KINSOKU_LINE_START_PROHIBITED = new Set<string>([
  '、',
  '。',
  '，',
  '．',
  '！',
  '？',
  '：',
  '；',
  '）',
  '〕',
  '］',
  '｝',
  '〉',
  '》',
  '」',
  '』',
  '】',
  '〗',
  '’',
  '”',
  '…',
  '—',
  '〜',
  '・',
  'ー',
  'ぁ',
  'ぃ',
  'ぅ',
  'ぇ',
  'ぉ',
  'っ',
  'ゃ',
  'ゅ',
  'ょ',
  'ゎ',
  'ァ',
  'ィ',
  'ゥ',
  'ェ',
  'ォ',
  'ッ',
  'ャ',
  'ュ',
  'ョ',
  'ヮ',
  'ヶ'
]);

/**
 * Characters that must NOT end a line (Kinsoku Tail / 不行末文字).
 */
export const KINSOKU_LINE_END_PROHIBITED = new Set<string>([
  '（',
  '〔',
  '［',
  '｛',
  '〈',
  '《',
  '「',
  '『',
  '【',
  '〖',
  '‘',
  '“',
  '￥',
  '＄',
  '￡',
  '№'
]);

/**
 * Checks if code point is in CJK Unicode range.
 */
export function isCjkCodePoint(cp: number): boolean {
  // CJK Unified Ideographs
  if (cp >= 0x4e00 && cp <= 0x9fff) return true;
  // CJK Unified Ideographs Extension A & B
  if (cp >= 0x3400 && cp <= 0x4dbf) return true;
  if (cp >= 0x20000 && cp <= 0x2a6df) return true;
  // Hiragana & Katakana
  if (cp >= 0x3040 && cp <= 0x30ff) return true;
  // Hangul Syllables
  if (cp >= 0xac00 && cp <= 0xd7af) return true;
  // Hangul Jamo
  if (cp >= 0x1100 && cp <= 0x11ff) return true;
  // CJK Symbols and Punctuation
  if (cp >= 0x3000 && cp <= 0x303f) return true;
  // Halfwidth and Fullwidth Forms
  if (cp >= 0xff00 && cp <= 0xffef) return true;
  return false;
}

/**
 * Checks if a character cannot start a line.
 */
export function isProhibitedLineStart(char: string): boolean {
  return KINSOKU_LINE_START_PROHIBITED.has(char);
}

/**
 * Checks if a character cannot end a line.
 */
export function isProhibitedLineEnd(char: string): boolean {
  return KINSOKU_LINE_END_PROHIBITED.has(char);
}

/**
 * CJK Layout and line-breaking engine
 */
export class CjkEngine {
  /**
   * Checks if text contains CJK characters.
   */
  hasCjk(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
      if (isCjkCodePoint(text.codePointAt(i)!)) return true;
    }
    return false;
  }

  /**
   * Applies Kinsoku Shori line-breaking rules to wrap CJK text.
   */
  wrapCjkLines(
    text: string,
    maxCharsPerLine: number,
    _writingMode: CjkWritingMode = 'horizontal-tb'
  ): CjkLineWrapResult {
    if (!text || maxCharsPerLine <= 0) {
      return { lines: [text], kinsokuAppliedCount: 0 };
    }

    const chars = Array.from(text);
    const lines: string[] = [];
    let currentLine: string[] = [];
    let kinsokuCount = 0;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]!;

      // Handle explicit line break
      if (ch === '\n') {
        lines.push(currentLine.join(''));
        currentLine = [];
        continue;
      }

      currentLine.push(ch);

      // Check if current line exceeded character budget
      if (currentLine.length >= maxCharsPerLine && i + 1 < chars.length) {
        const nextChar = chars[i + 1]!;

        // Rule 1: Line-start prohibition (next char cannot be at start of next line)
        if (isProhibitedLineStart(nextChar)) {
          // Push one extra character onto current line (Oidashi / 追い出し or Oikomi / 追い込み)
          currentLine.push(nextChar);
          i++;
          kinsokuCount++;
        }

        // Rule 2: Line-end prohibition (last char of current line cannot end line)
        const lastChar = currentLine[currentLine.length - 1]!;
        if (isProhibitedLineEnd(lastChar) && currentLine.length > 1) {
          // Move last char to next line
          currentLine.pop();
          i--;
          kinsokuCount++;
        }

        lines.push(currentLine.join(''));
        currentLine = [];
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine.join(''));
    }

    return { lines, kinsokuAppliedCount: kinsokuCount };
  }

  /**
   * Returns advance width multiplier for character (1.0 for CJK ideographs, 0.5 for Latin/halfwidth).
   */
  getCharacterAdvanceRatio(char: string): number {
    const cp = char.codePointAt(0)!;
    if (isCjkCodePoint(cp)) {
      // Fullwidth ideographs take 1.0em
      return 1.0;
    }
    // Halfwidth kana
    if (cp >= 0xff61 && cp <= 0xff9f) {
      return 0.5;
    }
    return 0.55;
  }
}
