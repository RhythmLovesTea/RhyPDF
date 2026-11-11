/**
 * @rhypdf/ocr
 * Task 10.10: OCR Language Metadata & Auto-Detection.
 * Supported OCR language packs, size estimates, and Unicode script heuristics.
 */

export interface OcrLanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  sizeBytes: number;
  sizeLabel: string;
  isRtl?: boolean;
}

export const SUPPORTED_OCR_LANGUAGES: OcrLanguageInfo[] = [
  {
    code: 'eng',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    sizeBytes: 1_984_273,
    sizeLabel: '1.9 MB'
  },
  {
    code: 'spa',
    name: 'Spanish',
    nativeName: 'Español',
    script: 'Latin',
    sizeBytes: 2_150_000,
    sizeLabel: '2.1 MB'
  },
  {
    code: 'fra',
    name: 'French',
    nativeName: 'Français',
    script: 'Latin',
    sizeBytes: 2_100_000,
    sizeLabel: '2.0 MB'
  },
  {
    code: 'deu',
    name: 'German',
    nativeName: 'Deutsch',
    script: 'Latin',
    sizeBytes: 2_200_000,
    sizeLabel: '2.1 MB'
  },
  {
    code: 'ita',
    name: 'Italian',
    nativeName: 'Italiano',
    script: 'Latin',
    sizeBytes: 2_050_000,
    sizeLabel: '2.0 MB'
  },
  {
    code: 'por',
    name: 'Portuguese',
    nativeName: 'Português',
    script: 'Latin',
    sizeBytes: 2_080_000,
    sizeLabel: '2.0 MB'
  },
  {
    code: 'ara',
    name: 'Arabic',
    nativeName: 'العربية',
    script: 'Arabic',
    sizeBytes: 2_450_000,
    sizeLabel: '2.3 MB',
    isRtl: true
  },
  {
    code: 'heb',
    name: 'Hebrew',
    nativeName: 'עברית',
    script: 'Hebrew',
    sizeBytes: 2_120_000,
    sizeLabel: '2.0 MB',
    isRtl: true
  },
  {
    code: 'hin',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    sizeBytes: 2_550_000,
    sizeLabel: '2.4 MB'
  },
  {
    code: 'chi_sim',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    script: 'Han',
    sizeBytes: 4_500_000,
    sizeLabel: '4.3 MB'
  },
  {
    code: 'jpn',
    name: 'Japanese',
    nativeName: '日本語',
    script: 'Japanese',
    sizeBytes: 4_800_000,
    sizeLabel: '4.6 MB'
  },
  {
    code: 'rus',
    name: 'Russian',
    nativeName: 'Русский',
    script: 'Cyrillic',
    sizeBytes: 2_300_000,
    sizeLabel: '2.2 MB'
  }
];

/**
 * Returns list of supported OCR languages.
 */
export function getSupportedOcrLanguages(): OcrLanguageInfo[] {
  return SUPPORTED_OCR_LANGUAGES;
}

/**
 * Auto-detects the most likely language code from a sample string or existing sparse text runs.
 */
export function detectLanguageFromText(sampleText: string): string {
  if (!sampleText || sampleText.trim().length === 0) {
    return 'eng';
  }

  let arabicCount = 0;
  let hebrewCount = 0;
  let devanagariCount = 0;
  let cjkCount = 0;
  let cyrillicCount = 0;
  let latinCount = 0;

  for (const ch of sampleText) {
    const cp = ch.codePointAt(0) || 0;
    if (cp >= 0x0600 && cp <= 0x06ff) arabicCount++;
    else if (cp >= 0x0590 && cp <= 0x05ff) hebrewCount++;
    else if (cp >= 0x0900 && cp <= 0x097f) devanagariCount++;
    else if ((cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3040 && cp <= 0x30ff)) cjkCount++;
    else if (cp >= 0x0400 && cp <= 0x04ff) cyrillicCount++;
    else if ((cp >= 0x0041 && cp <= 0x005a) || (cp >= 0x0061 && cp <= 0x007a)) latinCount++;
  }

  const max = Math.max(
    arabicCount,
    hebrewCount,
    devanagariCount,
    cjkCount,
    cyrillicCount,
    latinCount
  );
  if (max === 0) return 'eng';

  if (max === arabicCount) return 'ara';
  if (max === hebrewCount) return 'heb';
  if (max === devanagariCount) return 'hin';
  if (max === cjkCount) return 'chi_sim';
  if (max === cyrillicCount) return 'rus';
  return 'eng';
}
