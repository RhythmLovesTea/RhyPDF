/**
 * @rhypdf/text-layout - Emoji & Symbol Fallback Engine (Task 9.8)
 * Handles emoji detection, variation selectors (U+FE0E text vs U+FE0F emoji),
 * ZWJ sequences, skin tone modifiers, and advance calculations for PDF layout.
 */

export interface EmojiSequence {
  emojiText: string;
  codePoints: number[];
  isZwjSequence: boolean;
  hasSkinTone: boolean;
  isTextPresentation: boolean;
  isEmojiPresentation: boolean;
  advanceRatio: number;
  originalStart: number;
  originalEnd: number;
}

/**
 * Checks if code point is in emoji ranges.
 */
export function isEmojiCodePoint(cp: number): boolean {
  // Emoticons (1F600-1F64F)
  if (cp >= 0x1f600 && cp <= 0x1f64f) return true;
  // Misc Symbols and Pictographs (1F300-1F5FF)
  if (cp >= 0x1f300 && cp <= 0x1f5ff) return true;
  // Transport and Map Symbols (1F680-1F6FF)
  if (cp >= 0x1f680 && cp <= 0x1f6ff) return true;
  // Supplemental Symbols and Pictographs (1F900-1F9FF)
  if (cp >= 0x1f900 && cp <= 0x1f9ff) return true;
  // Symbols and Pictographs Extended-A (1FA70-1FAFF)
  if (cp >= 0x1fa70 && cp <= 0x1faff) return true;
  // Dingbats (2700-27BF)
  if (cp >= 0x2700 && cp <= 0x27bf) return true;
  // Misc Symbols (2600-26FF)
  if (cp >= 0x2600 && cp <= 0x26ff) return true;
  // Regional Indicator Symbols (Flags: 1F1E6-1F1FF)
  if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return true;
  // Keycaps and enclosing marks (20E3, etc.)
  if (cp === 0x20e3) return true;
  // Geometric Shapes (25A0-25FF)
  if (cp >= 0x25a0 && cp <= 0x25ff) return true;
  return false;
}

/**
 * Checks if code point is a skin tone modifier (U+1F3FB to U+1F3FF).
 */
export function isSkinToneModifier(cp: number): boolean {
  return cp >= 0x1f3fb && cp <= 0x1f3ff;
}

/**
 * Emoji and symbol detection and metric engine
 */
export class EmojiEngine {
  /**
   * Checks if string contains any emoji characters.
   */
  hasEmoji(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
      const cp = text.codePointAt(i)!;
      if (cp > 0xffff) i++;
      if (isEmojiCodePoint(cp)) return true;
    }
    return false;
  }

  /**
   * Parses text and extracts all emoji sequences (including ZWJ and modifiers).
   */
  extractEmojiSequences(text: string): EmojiSequence[] {
    const chars = Array.from(text);
    const sequences: EmojiSequence[] = [];

    let i = 0;
    while (i < chars.length) {
      const ch = chars[i]!;
      const cp = ch.codePointAt(0)!;

      if (isEmojiCodePoint(cp)) {
        const start = i;
        const codePoints: number[] = [cp];
        let isZwjSequence = false;
        let hasSkinTone = false;
        let isTextPresentation = false;
        let isEmojiPresentation = false;

        let j = i + 1;
        while (j < chars.length) {
          const nextCp = chars[j]!.codePointAt(0)!;

          // Zero Width Joiner (U+200D)
          if (nextCp === 0x200d) {
            isZwjSequence = true;
            codePoints.push(nextCp);
            j++;
            if (j < chars.length && isEmojiCodePoint(chars[j]!.codePointAt(0)!)) {
              codePoints.push(chars[j]!.codePointAt(0)!);
              j++;
            }
            continue;
          }

          // Skin tone modifier (U+1F3FB to U+1F3FF)
          if (isSkinToneModifier(nextCp)) {
            hasSkinTone = true;
            codePoints.push(nextCp);
            j++;
            continue;
          }

          // Variation Selectors: U+FE0E (text) or U+FE0F (emoji)
          if (nextCp === 0xfe0e) {
            isTextPresentation = true;
            codePoints.push(nextCp);
            j++;
            continue;
          }
          if (nextCp === 0xfe0f) {
            isEmojiPresentation = true;
            codePoints.push(nextCp);
            j++;
            continue;
          }

          // Regional indicator pair (Flag)
          if (nextCp >= 0x1f1e6 && nextCp <= 0x1f1ff && cp >= 0x1f1e6 && cp <= 0x1f1ff) {
            codePoints.push(nextCp);
            j++;
            break;
          }

          break;
        }

        const emojiText = chars.slice(start, j).join('');
        // Emoji width ratio: single emoji ~1.0em, flag/wide ZWJ sequence ~1.2em
        const advanceRatio = isZwjSequence ? 1.25 : 1.0;

        sequences.push({
          emojiText,
          codePoints,
          isZwjSequence,
          hasSkinTone,
          isTextPresentation,
          isEmojiPresentation,
          advanceRatio,
          originalStart: start,
          originalEnd: j
        });

        i = j;
      } else {
        i++;
      }
    }

    return sequences;
  }
}
