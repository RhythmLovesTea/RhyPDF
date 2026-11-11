/**
 * @rhypdf/text-layout - UAX #9 Bidirectional Algorithm Engine (Task 9.2)
 * Handles mixed LTR/RTL text, directional runs, visual reordering, mirrored punctuation,
 * and logical-to-visual caret coordinate mapping.
 */

export type Direction = 'ltr' | 'rtl';

export type BidiType =
  | 'L' // Strong Left-to-Right (Latin, Cyrillic, Greek, etc.)
  | 'R' // Strong Right-to-Left (Hebrew, etc.)
  | 'AL' // Right-to-Left Arabic (Arabic, Persian, Urdu)
  | 'EN' // European Number (0-9)
  | 'ES' // European Number Separator (+, -)
  | 'ET' // European Number Terminator ($, %, etc.)
  | 'AN' // Arabic Number (Arabic-Indic digits)
  | 'CS' // Common Number Separator (comma, colon, period)
  | 'NSM' // Non-Spacing Mark (diacritics, accents)
  | 'BN' // Boundary Neutral
  | 'B' // Paragraph Separator
  | 'S' // Segment Separator
  | 'WS' // Whitespace
  | 'ON' // Other Neutral (brackets, symbols, punctuation)
  | 'LRE'
  | 'RLE'
  | 'PDF'
  | 'LRO'
  | 'RLO'
  | 'LRI'
  | 'RLI'
  | 'FSI'
  | 'PDI';

export interface BidiRun {
  text: string;
  start: number;
  end: number;
  level: number;
  direction: Direction;
}

export interface BidiResult {
  baseDirection: Direction;
  visualText: string;
  visualRuns: BidiRun[];
  logicalToVisualMap: number[];
  visualToLogicalMap: number[];
}

/**
 * UAX #9 Character Mirroring Table for RTL contexts.
 */
export const BIDI_MIRRORED_PAIRS: Record<string, string> = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '<': '>',
  '>': '<',
  '«': '»',
  '»': '«',
  '‹': '›',
  '›': '‹',
  '⟨': '⟩',
  '⟩': '⟨',
  '⟪': '⟫',
  '⟫': '⟪',
  '⟦': '⟧',
  '⟧': '⟦'
};

/**
 * Classifies a Unicode code point into its UAX #9 Bidi category.
 */
export function classifyBidiType(cp: number): BidiType {
  // ASCII Range (0x00 - 0x7F)
  if (cp <= 0x007f) {
    if ((cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0061 && cp <= 0x007a)) return 'L';
    if (cp >= 0x0030 && cp <= 0x0039) return 'EN';
    if (cp === 0x0020 || cp === 0x0009) return 'WS';
    if (cp === 0x000a || cp === 0x000d) return 'B';
    if (cp === 0x002b || cp === 0x002d) return 'ES';
    if (cp === 0x002c || cp === 0x002e || cp === 0x003a || cp === 0x002f) return 'CS';
    if (cp === 0x0023 || cp === 0x0024 || cp === 0x0025) return 'ET';
    return 'ON';
  }

  // Arabic Range
  if (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  ) {
    // Arabic-Indic digits
    if (cp >= 0x0660 && cp <= 0x0669) return 'AN';
    // Eastern Arabic-Indic (Persian) digits
    if (cp >= 0x06f0 && cp <= 0x06f9) return 'EN';
    // Arabic diacritics / tashkeel (Non-spacing marks)
    if (cp >= 0x064b && cp <= 0x065f) return 'NSM';
    if (cp === 0x0670 || cp === 0x06d6 || cp === 0x06ed) return 'NSM';
    return 'AL';
  }

  // Hebrew Range
  if ((cp >= 0x0590 && cp <= 0x05ff) || (cp >= 0xfb1d && cp <= 0xfb4f)) {
    // Hebrew niqqud / cantillation (Non-spacing marks)
    if (cp >= 0x0591 && cp <= 0x05bd) return 'NSM';
    if (cp >= 0x05bf && cp <= 0x05c5) return 'NSM';
    if (cp === 0x05be) return 'R'; // Maqaf
    return 'R';
  }

  // Syriac, Thaana, Samaritan, Mandaic (RTL)
  if (
    (cp >= 0x0700 && cp <= 0x074f) ||
    (cp >= 0x0780 && cp <= 0x07bf) ||
    (cp >= 0x0800 && cp <= 0x083f) ||
    (cp >= 0x0840 && cp <= 0x085f)
  ) {
    return 'AL';
  }

  // Combining diacritical marks across scripts
  if (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff)
  ) {
    return 'NSM';
  }

  // Indic combining marks (Virama, Matras, Anusvara)
  if (
    cp >= 0x0900 &&
    cp <= 0x0d7f &&
    // Virama codes: Deva 094D, Beng 09CD, Guru 0A4D, Gujr 0ACD, Orya 0B4D, Taml 0BCD, Telu 0C4D, Knda 0CCD, Mlym 0D4D
    (cp % 0x0080 === 0x004d || (cp >= 0x093e && cp <= 0x094c) || (cp >= 0x0901 && cp <= 0x0903))
  ) {
    return 'NSM';
  }

  // Thai tone marks / vowels
  if ((cp >= 0x0e31 && cp <= 0x0e3a) || (cp >= 0x0e47 && cp <= 0x0e4e)) {
    return 'NSM';
  }

  // General Punctuation & Brackets
  if ((cp >= 0x2000 && cp <= 0x200a) || cp === 0x2028 || cp === 0x2029) return 'WS';
  if (cp >= 0x2018 && cp <= 0x201f) return 'ON';
  if (cp >= 0x2039 && cp <= 0x203a) return 'ON';

  // Explicit Bidi Controls
  if (cp === 0x202a) return 'LRE';
  if (cp === 0x202b) return 'RLE';
  if (cp === 0x202c) return 'PDF';
  if (cp === 0x202d) return 'LRO';
  if (cp === 0x202e) return 'RLO';
  if (cp === 0x2066) return 'LRI';
  if (cp === 0x2067) return 'RLI';
  if (cp === 0x2068) return 'FSI';
  if (cp === 0x2069) return 'PDI';

  // Latin Extended, Cyrillic, Greek, Indic, CJK, etc. are Strong LTR
  return 'L';
}

/**
 * Determines paragraph base direction (Rule P2-P3).
 * Finds the first strong L, AL, or R character.
 */
export function determineBaseDirection(text: string, defaultDir: Direction = 'ltr'): Direction {
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i)!;
    if (cp > 0xffff) i++;
    const type = classifyBidiType(cp);
    if (type === 'L') return 'ltr';
    if (type === 'R' || type === 'AL') return 'rtl';
  }
  return defaultDir;
}

/**
 * UAX #9 Bidirectional Resolution Engine
 */
export class BidiEngine {
  /**
   * Resolves bidi embedding levels and reorders text visually.
   */
  resolve(text: string, overrideBaseDir?: Direction): BidiResult {
    if (!text) {
      return {
        baseDirection: overrideBaseDir || 'ltr',
        visualText: '',
        visualRuns: [],
        logicalToVisualMap: [],
        visualToLogicalMap: []
      };
    }

    const baseDirection = overrideBaseDir || determineBaseDirection(text);
    const baseLevel = baseDirection === 'rtl' ? 1 : 0;

    const chars = Array.from(text);
    const length = chars.length;
    const types: BidiType[] = [];

    for (let i = 0; i < length; i++) {
      const cp = chars[i]!.codePointAt(0)!;
      types.push(classifyBidiType(cp));
    }

    // Step 1: Assign initial embedding levels based on character types
    const levels: number[] = new Array(length).fill(baseLevel);

    for (let i = 0; i < length; i++) {
      const t = types[i]!;
      if (t === 'R' || t === 'AL') {
        levels[i] = baseLevel % 2 === 1 ? baseLevel : baseLevel + 1;
      } else if (t === 'L') {
        levels[i] = baseLevel % 2 === 0 ? baseLevel : baseLevel + 1;
      } else if (t === 'EN' || t === 'AN') {
        levels[i] = baseLevel % 2 === 1 ? baseLevel + 1 : baseLevel;
      } else {
        levels[i] = baseLevel;
      }
    }

    // Step 2: Resolve Neutral and Weak types (surrounding context)
    for (let i = 0; i < length; i++) {
      if (types[i] === 'ON' || types[i] === 'WS' || types[i] === 'CS') {
        // Find previous and next strong levels
        let prevLevel = baseLevel;
        for (let p = i - 1; p >= 0; p--) {
          if (types[p] === 'L' || types[p] === 'R' || types[p] === 'AL') {
            prevLevel = levels[p]!;
            break;
          }
        }
        let nextLevel = baseLevel;
        for (let n = i + 1; n < length; n++) {
          if (types[n] === 'L' || types[n] === 'R' || types[n] === 'AL') {
            nextLevel = levels[n]!;
            break;
          }
        }

        if (prevLevel === nextLevel) {
          levels[i] = prevLevel;
        } else {
          levels[i] = baseLevel;
        }
      }
    }

    // Step 3: Segment into contiguous directional runs
    const runs: BidiRun[] = [];
    let runStart = 0;
    let currentLevel = levels[0]!;

    for (let i = 1; i < length; i++) {
      if (levels[i] !== currentLevel) {
        runs.push({
          start: runStart,
          end: i,
          level: currentLevel,
          direction: currentLevel % 2 === 1 ? 'rtl' : 'ltr',
          text: chars.slice(runStart, i).join('')
        });
        runStart = i;
        currentLevel = levels[i]!;
      }
    }
    runs.push({
      start: runStart,
      end: length,
      level: currentLevel,
      direction: currentLevel % 2 === 1 ? 'rtl' : 'ltr',
      text: chars.slice(runStart, length).join('')
    });

    // Step 4: Reorder runs for visual output (Rule L2)
    let maxLevel = 0;
    for (const r of runs) {
      if (r.level > maxLevel) maxLevel = r.level;
    }

    // Build visual ordering of runs
    const visualRuns = [...runs];
    for (let lvl = maxLevel; lvl >= 1; lvl--) {
      let sliceStart = -1;
      for (let i = 0; i <= visualRuns.length; i++) {
        if (i < visualRuns.length && visualRuns[i]!.level >= lvl) {
          if (sliceStart === -1) sliceStart = i;
        } else if (sliceStart !== -1) {
          // Reverse run slice from sliceStart to i - 1
          const reversed = visualRuns.slice(sliceStart, i).reverse();
          visualRuns.splice(sliceStart, i - sliceStart, ...reversed);
          sliceStart = -1;
        }
      }
    }

    // Step 5: Mirror punctuation characters in RTL runs (Rule L4)
    const visualChars: string[] = [];
    const visualToLogicalMap: number[] = [];

    for (const run of visualRuns) {
      const runChars = Array.from(run.text);
      if (run.direction === 'rtl') {
        // Reverse characters within RTL run
        runChars.reverse();
        for (let j = 0; j < runChars.length; j++) {
          const ch = runChars[j]!;
          const mirrored = BIDI_MIRRORED_PAIRS[ch] || ch;
          visualChars.push(mirrored);
          const origIdx = run.end - 1 - j;
          visualToLogicalMap.push(origIdx);
        }
      } else {
        for (let j = 0; j < runChars.length; j++) {
          const ch = runChars[j]!;
          visualChars.push(ch);
          const origIdx = run.start + j;
          visualToLogicalMap.push(origIdx);
        }
      }
    }

    // Build inverse logical-to-visual map
    const logicalToVisualMap: number[] = new Array(length);
    for (let v = 0; v < visualToLogicalMap.length; v++) {
      const log = visualToLogicalMap[v]!;
      logicalToVisualMap[log] = v;
    }

    return {
      baseDirection,
      visualText: visualChars.join(''),
      visualRuns,
      logicalToVisualMap,
      visualToLogicalMap
    };
  }
}
