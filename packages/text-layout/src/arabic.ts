/**
 * @rhypdf/text-layout - Arabic Script Engine (Task 9.3)
 * Handles contextual joining (isolated/initial/medial/final), Lam-Alef ligatures,
 * Tashkeel (diacritics/harakat) and numeral sets (Eastern Arabic-Indic vs Western).
 */

export type ArabicJoiningType = 'U' | 'R' | 'D' | 'C' | 'T';
// U: Non-joining
// R: Right-joining (joins with preceding letter, not following)
// D: Dual-joining (joins with preceding and following)
// C: Join-causing (ZWJ)
// T: Transparent (Tashkeel / diacritics)

export type ArabicForm = 'isolated' | 'initial' | 'medial' | 'final';

export interface ArabicShapedChar {
  originalChar: string;
  shapedChar: string;
  form: ArabicForm;
  originalIndex: number;
  isLigature?: boolean;
}

/**
 * Character mapping to Arabic Presentation Forms-B (Unicode U+FE80 - U+FEFC).
 * Tuple format: [isolated, final, initial, medial]
 */
const ARABIC_GLYPH_FORMS: Record<number, [number, number, number, number]> = {
  // Hamza
  0x0621: [0xfe80, 0xfe80, 0xfe80, 0xfe80],
  // Alef with Madda above
  0x0622: [0xfe81, 0xfe82, 0xfe81, 0xfe82],
  // Alef with Hamza above
  0x0623: [0xfe83, 0xfe84, 0xfe83, 0xfe84],
  // Waw with Hamza above
  0x0624: [0xfe85, 0xfe86, 0xfe85, 0xfe86],
  // Alef with Hamza below
  0x0625: [0xfe87, 0xfe88, 0xfe87, 0xfe88],
  // Ya with Hamza above
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  // Alef
  0x0627: [0xfe8d, 0xfe8e, 0xfe8d, 0xfe8e],
  // Ba
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  // Ta Marbuta
  0x0629: [0xfe93, 0xfe94, 0xfe93, 0xfe94],
  // Ta
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  // Tha
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  // Jim
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  // Hah
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  // Khah
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  // Dal
  0x062f: [0xfea9, 0xfeaa, 0xfea9, 0xfeaa],
  // Thal
  0x0630: [0xfeab, 0xfeac, 0xfeab, 0xfeac],
  // Reh
  0x0631: [0xfead, 0xfeae, 0xfead, 0xfeae],
  // Zain
  0x0632: [0xfeaf, 0xfeb0, 0xfeaf, 0xfeb0],
  // Seen
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  // Sheen
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  // Sad
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  // Dad
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  // Tah
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  // Zah
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  // Ain
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  // Ghain
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0],
  // Feh
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  // Qaf
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  // Kaf
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  // Lam
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0],
  // Meem
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  // Noon
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  // Heh
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  // Waw
  0x0648: [0xfeed, 0xfeee, 0xfeed, 0xfeee],
  // Alef Maksura
  0x0649: [0xfeef, 0xfef0, 0xfbe8, 0xfbe9],
  // Yeh
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4]
};

/**
 * Returns Arabic joining type for a character.
 */
export function getArabicJoiningType(cp: number): ArabicJoiningType {
  // Tashkeel / Harakat (Transparent)
  if ((cp >= 0x064b && cp <= 0x065f) || cp === 0x0670 || cp === 0x06d6 || cp === 0x06ed) {
    return 'T';
  }

  // Zero-width non-joiner
  if (cp === 0x200c) return 'U';
  // Zero-width joiner
  if (cp === 0x200d) return 'C';

  // Right-joining characters (Alef, Dal, Thal, Reh, Zain, Waw, etc.)
  if (
    cp === 0x0622 ||
    cp === 0x0623 ||
    cp === 0x0624 ||
    cp === 0x0625 ||
    cp === 0x0627 ||
    cp === 0x062f ||
    cp === 0x0630 ||
    cp === 0x0631 ||
    cp === 0x0632 ||
    cp === 0x0648 ||
    cp === 0x0649
  ) {
    return 'R';
  }

  // Dual-joining characters
  if (
    (cp >= 0x0628 && cp <= 0x062e) ||
    (cp >= 0x0633 && cp <= 0x063a) ||
    (cp >= 0x0641 && cp <= 0x0647) ||
    cp === 0x064a ||
    cp === 0x0626
  ) {
    return 'D';
  }

  return 'U';
}

/**
 * Checks if a code point is Arabic Tashkeel (diacritic mark).
 */
export function isArabicTashkeel(cp: number): boolean {
  return (cp >= 0x064b && cp <= 0x065f) || cp === 0x0670 || cp === 0x06d6 || cp === 0x06ed;
}

/**
 * Arabic contextual shaper and ligature builder
 */
export class ArabicEngine {
  /**
   * Shapes Arabic text into presentation forms (joining, ligatures, tashkeel).
   */
  shapeText(text: string): ArabicShapedChar[] {
    const chars = Array.from(text);
    const result: ArabicShapedChar[] = [];

    let i = 0;
    while (i < chars.length) {
      const ch = chars[i]!;
      const cp = ch.codePointAt(0)!;

      // Transparent diacritics
      if (isArabicTashkeel(cp)) {
        result.push({
          originalChar: ch,
          shapedChar: ch,
          form: 'isolated',
          originalIndex: i
        });
        i++;
        continue;
      }

      // Check Lam-Alef Ligatures (ل + ا / لأ / لإ / لآ)
      if (cp === 0x0644 && i + 1 < chars.length) {
        // Skip any transparent tashkeel between Lam and Alef
        let nextIdx = i + 1;
        while (nextIdx < chars.length && isArabicTashkeel(chars[nextIdx]!.codePointAt(0)!)) {
          nextIdx++;
        }

        if (nextIdx < chars.length) {
          const nextCp = chars[nextIdx]!.codePointAt(0)!;
          let ligatureIsolated = 0;
          let ligatureFinal = 0;

          if (nextCp === 0x0627) {
            // Lam + Alef -> لا
            ligatureIsolated = 0xfefb;
            ligatureFinal = 0xfefc;
          } else if (nextCp === 0x0623) {
            // Lam + Alef with Hamza above -> لأ
            ligatureIsolated = 0xfef7;
            ligatureFinal = 0xfef8;
          } else if (nextCp === 0x0625) {
            // Lam + Alef with Hamza below -> لإ
            ligatureIsolated = 0xfef9;
            ligatureFinal = 0xfefa;
          } else if (nextCp === 0x0622) {
            // Lam + Alef with Madda -> لآ
            ligatureIsolated = 0xfef5;
            ligatureFinal = 0xfef6;
          }

          if (ligatureIsolated > 0) {
            // Check preceding joining context for Lam
            let prevType: ArabicJoiningType = 'U';
            for (let p = i - 1; p >= 0; p--) {
              const prevCp = chars[p]!.codePointAt(0)!;
              const jt = getArabicJoiningType(prevCp);
              if (jt !== 'T') {
                prevType = jt;
                break;
              }
            }

            const isFinal = prevType === 'D' || prevType === 'C';
            const shapedCode = isFinal ? ligatureFinal : ligatureIsolated;

            result.push({
              originalChar: ch + chars[nextIdx]!,
              shapedChar: String.fromCodePoint(shapedCode),
              form: isFinal ? 'final' : 'isolated',
              originalIndex: i,
              isLigature: true
            });

            i = nextIdx + 1;
            continue;
          }
        }
      }

      // Normal letter contextual form
      const forms = ARABIC_GLYPH_FORMS[cp];
      if (!forms) {
        // Non-Arabic or neutral character
        result.push({
          originalChar: ch,
          shapedChar: ch,
          form: 'isolated',
          originalIndex: i
        });
        i++;
        continue;
      }

      // Check preceding character
      let joinsPreceding = false;
      for (let p = i - 1; p >= 0; p--) {
        const prevCp = chars[p]!.codePointAt(0)!;
        const jt = getArabicJoiningType(prevCp);
        if (jt === 'T') continue;
        if (jt === 'D' || jt === 'C') {
          joinsPreceding = true;
        }
        break;
      }

      // Check following character
      let joinsFollowing = false;
      const currentJoining = getArabicJoiningType(cp);
      if (currentJoining === 'D' || currentJoining === 'C') {
        for (let n = i + 1; n < chars.length; n++) {
          const nextCp = chars[n]!.codePointAt(0)!;
          const jt = getArabicJoiningType(nextCp);
          if (jt === 'T') continue;
          if (jt === 'D' || jt === 'R' || jt === 'C') {
            joinsFollowing = true;
          }
          break;
        }
      }

      let form: ArabicForm;
      let formIdx: number; // 0: isolated, 1: final, 2: initial, 3: medial

      if (joinsPreceding && joinsFollowing) {
        form = 'medial';
        formIdx = 3;
      } else if (joinsPreceding) {
        form = 'final';
        formIdx = 1;
      } else if (joinsFollowing) {
        form = 'initial';
        formIdx = 2;
      } else {
        form = 'isolated';
        formIdx = 0;
      }

      const shapedCp = forms[formIdx] || forms[0];
      result.push({
        originalChar: ch,
        shapedChar: String.fromCodePoint(shapedCp),
        form,
        originalIndex: i
      });

      i++;
    }

    return result;
  }

  /**
   * Converts between Western numerals (0-9) and Eastern Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩).
   */
  convertNumerals(text: string, target: 'western' | 'eastern' | 'persian'): string {
    const westernDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    let out = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]!;
      let wIdx = westernDigits.indexOf(ch);
      if (wIdx === -1) wIdx = easternDigits.indexOf(ch);
      if (wIdx === -1) wIdx = persianDigits.indexOf(ch);

      if (wIdx !== -1) {
        if (target === 'western') out += westernDigits[wIdx];
        else if (target === 'eastern') out += easternDigits[wIdx];
        else if (target === 'persian') out += persianDigits[wIdx];
      } else {
        out += ch;
      }
    }
    return out;
  }
}
