/**
 * @rhypdf/text-layout - Indic Scripts Engine (Task 9.5)
 * Handles orthographic syllable (Akshara) segmentation, virama conjuncts,
 * pre-base vowel sign (Matra) reordering, Reph and Ra-kar formations across:
 * Devanagari, Bengali, Gurmukhi, Gujarati, Tamil, Telugu, Kannada, Malayalam.
 */

export type IndicScript =
  'devanagari' | 'bengali' | 'gurmukhi' | 'gujarati' | 'tamil' | 'telugu' | 'kannada' | 'malayalam';

export interface IndicAkshara {
  consonants: string[];
  halants: string[];
  nukta?: string;
  matras: string[];
  modifiers: string[];
  fullCluster: string;
  hasReph: boolean;
  hasPreBaseMatra: boolean;
  preBaseMatraChar?: string;
  visualCluster: string;
  originalStart: number;
  originalEnd: number;
}

/**
 * Virama (Halant) code points for each Indic script.
 */
export const INDIC_VIRAMAS = new Set<number>([
  0x094d, // Devanagari
  0x09cd, // Bengali
  0x0a4d, // Gurmukhi
  0x0acd, // Gujarati
  0x0bcd, // Tamil
  0x0c4d, // Telugu
  0x0ccd, // Kannada
  0x0d4d // Malayalam
]);

/**
 * Pre-base Matras that render to the left of the consonant cluster.
 */
export const PRE_BASE_MATRAS = new Set<number>([
  0x093f, // Devanagari Vowel Sign I (ि)
  0x09bf, // Bengali Vowel Sign I (ি)
  0x0a3f, // Gurmukhi Vowel Sign I (ਿ)
  0x0ac7, // Gujarati Vowel Sign E (િ)
  0x0bc6, // Tamil Vowel Sign E (ெ)
  0x0bc7, // Tamil Vowel Sign EE (ே)
  0x0bc8, // Tamil Vowel Sign AI (ை)
  0x0d46, // Malayalam Vowel Sign E (െ)
  0x0d47, // Malayalam Vowel Sign EE (േ)
  0x0d48 // Malayalam Vowel Sign AI (ൈ)
]);

/**
 * Checks if a code point belongs to an Indic script block.
 */
export function isIndicCodePoint(cp: number): boolean {
  return cp >= 0x0900 && cp <= 0x0d7f;
}

/**
 * Checks if a code point is an Indic Virama / Halant.
 */
export function isIndicVirama(cp: number): boolean {
  return INDIC_VIRAMAS.has(cp);
}

/**
 * Checks if a code point is an Indic pre-base vowel sign.
 */
export function isPreBaseMatra(cp: number): boolean {
  return PRE_BASE_MATRAS.has(cp);
}

/**
 * Checks if a code point is an Indic post-base or above/below vowel sign (Matra).
 */
export function isIndicMatra(cp: number): boolean {
  if (isPreBaseMatra(cp)) return true;
  // Devanagari matras
  if (cp >= 0x093e && cp <= 0x094c) return true;
  if (cp >= 0x094e && cp <= 0x094f) return true;
  // Bengali matras
  if (cp >= 0x09be && cp <= 0x09cc) return true;
  // Gurmukhi matras
  if (cp >= 0x0a3e && cp <= 0x0a4c) return true;
  // Gujarati matras
  if (cp >= 0x0abe && cp <= 0x0acc) return true;
  // Tamil matras
  if (cp >= 0x0bbe && cp <= 0x0bcc) return true;
  // Telugu matras
  if (cp >= 0x0c3e && cp <= 0x0c4c) return true;
  // Kannada matras
  if (cp >= 0x0cbe && cp <= 0x0ccc) return true;
  // Malayalam matras
  if (cp >= 0x0d3e && cp <= 0x0d4c) return true;
  return false;
}

/**
 * Checks if a code point is an Indic modifier (Anusvara, Visarga, Candrabindu).
 */
export function isIndicModifier(cp: number): boolean {
  // Generic pattern across Indic blocks: offsets 0x01 (Candrabindu), 0x02 (Anusvara), 0x03 (Visarga)
  const offset = cp % 0x0080;
  return offset >= 0x01 && offset <= 0x03;
}

/**
 * Indic Akshara segmentation and reordering engine
 */
export class IndicEngine {
  /**
   * Segments Indic text into Akshara orthographic syllables and reorders pre-base matras.
   */
  segmentAksharas(text: string): IndicAkshara[] {
    const chars = Array.from(text);
    const result: IndicAkshara[] = [];

    let i = 0;
    while (i < chars.length) {
      const ch = chars[i]!;
      const cp = ch.codePointAt(0)!;

      if (!isIndicCodePoint(cp)) {
        // Non-indic character
        result.push({
          consonants: [ch],
          halants: [],
          matras: [],
          modifiers: [],
          fullCluster: ch,
          hasReph: false,
          hasPreBaseMatra: false,
          visualCluster: ch,
          originalStart: i,
          originalEnd: i + 1
        });
        i++;
        continue;
      }

      // Start of Akshara syllable
      const start = i;
      const consonants: string[] = [ch];
      const halants: string[] = [];
      let nukta: string | undefined;
      const matras: string[] = [];
      const modifiers: string[] = [];

      let hasReph = false;
      let hasPreBaseMatra = false;
      let preBaseMatraChar: string | undefined;

      // Check if starting with Ra + Halant (Reph)
      if (
        (cp === 0x0930 || cp === 0x09b0 || cp === 0x0a30 || cp === 0x0ab0 || cp === 0x0bb0) &&
        i + 1 < chars.length &&
        isIndicVirama(chars[i + 1]!.codePointAt(0)!)
      ) {
        hasReph = true;
      }

      i++;

      // Consume consonant clusters joined by virama: (Virama + Consonant)*
      while (i < chars.length) {
        const curCp = chars[i]!.codePointAt(0)!;
        if (isIndicVirama(curCp)) {
          halants.push(chars[i]!);
          i++;
          if (i < chars.length && isIndicCodePoint(chars[i]!.codePointAt(0)!)) {
            const nextCp = chars[i]!.codePointAt(0)!;
            // Check if next is Nukta
            if (nextCp % 0x0080 === 0x003c) {
              nukta = chars[i]!;
              i++;
            }
            if (i < chars.length && !isIndicMatra(chars[i]!.codePointAt(0)!)) {
              consonants.push(chars[i]!);
              i++;
            }
          }
        } else {
          break;
        }
      }

      // Consume Nukta
      if (i < chars.length && chars[i]!.codePointAt(0)! % 0x0080 === 0x003c) {
        nukta = chars[i]!;
        i++;
      }

      // Consume Vowel Signs (Matras)
      while (i < chars.length && isIndicMatra(chars[i]!.codePointAt(0)!)) {
        const mCp = chars[i]!.codePointAt(0)!;
        matras.push(chars[i]!);
        if (isPreBaseMatra(mCp)) {
          hasPreBaseMatra = true;
          preBaseMatraChar = chars[i]!;
        }
        i++;
      }

      // Consume Modifiers (Anusvara, Visarga, Candrabindu)
      while (i < chars.length && isIndicModifier(chars[i]!.codePointAt(0)!)) {
        modifiers.push(chars[i]!);
        i++;
      }

      // Full original logical string for the syllable
      const fullCluster = chars.slice(start, i).join('');

      // Build visual presentation string:
      // If pre-base matra exists, place matra before consonant cluster visually
      let visualCluster: string;
      if (hasPreBaseMatra && preBaseMatraChar) {
        const otherMatras = matras.filter((m) => m !== preBaseMatraChar);
        visualCluster =
          preBaseMatraChar +
          consonants.join('') +
          (nukta || '') +
          otherMatras.join('') +
          modifiers.join('');
      } else {
        visualCluster = fullCluster;
      }

      result.push({
        consonants,
        halants,
        nukta,
        matras,
        modifiers,
        fullCluster,
        hasReph,
        hasPreBaseMatra,
        preBaseMatraChar,
        visualCluster,
        originalStart: start,
        originalEnd: i
      });
    }

    return result;
  }
}
