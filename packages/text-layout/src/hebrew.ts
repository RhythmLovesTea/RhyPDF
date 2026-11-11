/**
 * @rhypdf/text-layout - Hebrew Script Engine (Task 9.4)
 * Handles Hebrew RTL processing, Niqqud (vowel points) combining marks,
 * Cantillation marks (Teamim), Maqaf (hyphen), and grapheme cluster binding.
 */

export interface HebrewCluster {
  baseChar: string;
  marks: string[];
  fullCluster: string;
  originalIndex: number;
}

/**
 * Checks if code point is Hebrew Niqqud (vowel point).
 */
export function isHebrewNiqqud(cp: number): boolean {
  return cp >= 0x05b0 && cp <= 0x05c2 && cp !== 0x05be;
}

/**
 * Checks if code point is Hebrew Cantillation / Accent mark (Teamim).
 */
export function isHebrewCantillation(cp: number): boolean {
  return cp >= 0x0591 && cp <= 0x05af;
}

/**
 * Checks if code point is any Hebrew combining mark (Niqqud or Teamim).
 */
export function isHebrewCombiningMark(cp: number): boolean {
  return isHebrewNiqqud(cp) || isHebrewCantillation(cp);
}

/**
 * Hebrew script engine
 */
export class HebrewEngine {
  /**
   * Identifies whether string contains Hebrew characters.
   */
  hasHebrew(text: string): boolean {
    for (let i = 0; i < text.length; i++) {
      const cp = text.codePointAt(i)!;
      if (cp >= 0x0590 && cp <= 0x05ff) return true;
    }
    return false;
  }

  /**
   * Segments Hebrew text into base-consonant clusters with their bound Niqqud marks.
   */
  segmentClusters(text: string): HebrewCluster[] {
    const chars = Array.from(text);
    const clusters: HebrewCluster[] = [];

    let i = 0;
    while (i < chars.length) {
      const ch = chars[i]!;
      const cp = ch.codePointAt(0)!;

      if (!isHebrewCombiningMark(cp)) {
        // Base character (consonant or punctuation)
        const marks: string[] = [];
        let j = i + 1;
        while (j < chars.length && isHebrewCombiningMark(chars[j]!.codePointAt(0)!)) {
          marks.push(chars[j]!);
          j++;
        }

        clusters.push({
          baseChar: ch,
          marks,
          fullCluster: ch + marks.join(''),
          originalIndex: i
        });

        i = j;
      } else {
        // Isolated mark without base
        clusters.push({
          baseChar: '',
          marks: [ch],
          fullCluster: ch,
          originalIndex: i
        });
        i++;
      }
    }

    return clusters;
  }

  /**
   * Strips all Niqqud and cantillation marks from Hebrew text for search indexing.
   */
  stripNiqqud(text: string): string {
    return text.replace(/[\u0591-\u05BD\u05BF-\u05C2\u05C4\u05C5\u05C7]/g, '');
  }
}
