/**
 * @rhypdf/text-layout - Thai Script Engine (Task 9.6)
 * Handles Thai no-space word segmentation via Intl.Segmenter, stacked marks (tone marks + vowels),
 * and syllable line-break opportunities.
 */

export type ThaiCharType =
  | 'consonant'
  | 'leading_vowel'
  | 'following_vowel'
  | 'above_vowel'
  | 'below_vowel'
  | 'tone_mark'
  | 'canceller'
  | 'other';

export interface ThaiWord {
  text: string;
  isWordLike: boolean;
  start: number;
  end: number;
}

export interface ThaiGrapheme {
  base: string;
  belowVowel?: string;
  aboveVowel?: string;
  toneMark?: string;
  canceller?: string;
  fullCluster: string;
}

/**
 * Classifies Thai character type.
 */
export function classifyThaiChar(cp: number): ThaiCharType {
  // Consonants: Ko Kai (0x0E01) to Ho Nok-huk (0x0E2E)
  if (cp >= 0x0e01 && cp <= 0x0e2e) return 'consonant';

  // Leading vowels: Sara E, Sara Ae, Sara O, Sara Ai Maimuan, Sara Ai Maimalai
  if (cp >= 0x0e40 && cp <= 0x0e44) return 'leading_vowel';

  // Following vowels: Sara A (0x0E30), Sara Aa (0x0E32), Sara Am (0x0E33)
  if (cp === 0x0e30 || cp === 0x0e32 || cp === 0x0e33) return 'following_vowel';

  // Above vowels: Mai Han-Akat (0x0E31), Sara I (0x0E34), Sara Ii (0x0E35), Sara Ue (0x0E36), Sara Uee (0x0E37), Maitaikhu (0x0E47)
  if ((cp >= 0x0e34 && cp <= 0x0e37) || cp === 0x0e31 || cp === 0x0e47) return 'above_vowel';

  // Below vowels: Sara U (0x0E38), Sara Uu (0x0E39), Phinthu (0x0E3A)
  if (cp >= 0x0e38 && cp <= 0x0e3a) return 'below_vowel';

  // Tone marks: Mai Ek (0x0E48), Mai Tho (0x0E49), Mai Tri (0x0E4A), Mai Chattawa (0x0E4B)
  if (cp >= 0x0e48 && cp <= 0x0e4b) return 'tone_mark';

  // Thanthakhat / Karan (0x0E4C)
  if (cp === 0x0e4c) return 'canceller';

  return 'other';
}

/**
 * Checks if code point is in Thai Unicode block (0x0E00 - 0x0E7F).
 */
export function isThaiCodePoint(cp: number): boolean {
  return cp >= 0x0e00 && cp <= 0x0e7f;
}

/**
 * Thai script engine
 */
export class ThaiEngine {
  /**
   * Checks if string contains Thai text.
   */
  hasThai(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
      if (isThaiCodePoint(text.codePointAt(i)!)) return true;
    }
    return false;
  }

  /**
   * Segments Thai text into words for natural line wrapping using Intl.Segmenter.
   */
  segmentWords(text: string): ThaiWord[] {
    if (!text) return [];

    // Use Intl.Segmenter with locale 'th' if available
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      try {
        const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
        const segments = Array.from(segmenter.segment(text));
        return segments.map((s) => ({
          text: s.segment,
          isWordLike: s.isWordLike ?? true,
          start: s.index,
          end: s.index + s.segment.length
        }));
      } catch {
        // Fallback
      }
    }

    // Heuristic fallback: segment by spaces and punctuation
    const words: ThaiWord[] = [];
    const tokens = text.split(/(\s+|[.,!?;:])/);
    let offset = 0;
    for (const t of tokens) {
      if (!t) continue;
      words.push({
        text: t,
        isWordLike: !/^\s+$/.test(t),
        start: offset,
        end: offset + t.length
      });
      offset += t.length;
    }
    return words;
  }

  /**
   * Segments Thai text into clustered graphemes (Consonant + Stacked Marks).
   */
  segmentGraphemes(text: string): ThaiGrapheme[] {
    const chars = Array.from(text);
    const graphemes: ThaiGrapheme[] = [];

    let i = 0;
    while (i < chars.length) {
      const ch = chars[i]!;
      const cp = ch.codePointAt(0)!;
      const type = classifyThaiChar(cp);

      if (
        type === 'consonant' ||
        type === 'leading_vowel' ||
        type === 'following_vowel' ||
        type === 'other'
      ) {
        let belowVowel: string | undefined;
        let aboveVowel: string | undefined;
        let toneMark: string | undefined;
        let canceller: string | undefined;

        let j = i + 1;
        while (j < chars.length) {
          const nextCp = chars[j]!.codePointAt(0)!;
          const nextType = classifyThaiChar(nextCp);

          if (nextType === 'below_vowel') {
            belowVowel = chars[j]!;
            j++;
          } else if (nextType === 'above_vowel') {
            aboveVowel = chars[j]!;
            j++;
          } else if (nextType === 'tone_mark') {
            toneMark = chars[j]!;
            j++;
          } else if (nextType === 'canceller') {
            canceller = chars[j]!;
            j++;
          } else {
            break;
          }
        }

        const fullCluster = chars.slice(i, j).join('');
        graphemes.push({
          base: ch,
          belowVowel,
          aboveVowel,
          toneMark,
          canceller,
          fullCluster
        });

        i = j;
      } else {
        // Isolated mark
        graphemes.push({
          base: ch,
          fullCluster: ch
        });
        i++;
      }
    }

    return graphemes;
  }
}
