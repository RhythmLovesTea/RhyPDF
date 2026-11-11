/**
 * @rhypdf/fonts - FontCatalog & Font Registry
 * Google-Docs style font catalog supporting bundled, downloaded, local, and imported fonts.
 * Tasks 8.1, 8.2, 8.3, 8.15.
 */

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontStyle = 'normal' | 'italic' | 'oblique';
export type FontCategory = 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
export type FontSource = 'bundled' | 'downloaded' | 'local' | 'user' | 'from-pdf';
export type FontLicense = 'OFL' | 'Apache-2.0' | 'GPL-Font-Exception' | 'Proprietary' | 'Custom';

export interface FontCatalogEntry {
  id: string;
  family: string;
  displayName: string;
  category: FontCategory;
  weights: FontWeight[];
  styles: FontStyle[];
  supportedScripts: string[];
  source: FontSource;
  license: FontLicense;
  embeddable: boolean;
  metricCompatibleWith?: string[];
  isVariable?: boolean;
  downloadUrl?: string;
  approxSizeBytes?: number;
  version?: string;
}

export interface FontFilterOptions {
  searchQuery?: string;
  category?: FontCategory | 'all';
  script?: string | 'all';
  source?: FontSource | 'all';
}

/**
 * Standard PDF core fonts (Task 2.1 sketch & baseline)
 */
export const CORE_PDF_FONTS = [
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
  'Courier',
  'Courier-Bold',
  'Courier-Oblique',
  'Courier-BoldOblique',
  'Symbol',
  'ZapfDingbats'
] as const;

/**
 * Task 8.2: Starter set of open-license (OFL / Apache-2.0) fonts
 * Verified open licenses, self-hosted friendly.
 */
export const STARTER_BUNDLED_FONTS: FontCatalogEntry[] = [
  // Sans-serif
  {
    id: 'roboto',
    family: 'Roboto',
    displayName: 'Roboto',
    category: 'sans-serif',
    weights: [100, 300, 400, 500, 700, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'Apache-2.0',
    embeddable: true,
    version: '2.138'
  },
  {
    id: 'open-sans',
    family: 'Open Sans',
    displayName: 'Open Sans',
    category: 'sans-serif',
    weights: [300, 400, 500, 600, 700, 800],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'lato',
    family: 'Lato',
    displayName: 'Lato',
    category: 'sans-serif',
    weights: [100, 300, 400, 700, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'montserrat',
    family: 'Montserrat',
    displayName: 'Montserrat',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'poppins',
    family: 'Poppins',
    displayName: 'Poppins',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'devanagari'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'inter',
    family: 'Inter',
    displayName: 'Inter',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true,
    isVariable: true
  },
  {
    id: 'source-sans-3',
    family: 'Source Sans 3',
    displayName: 'Source Sans 3',
    category: 'sans-serif',
    weights: [200, 300, 400, 600, 700, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'nunito',
    family: 'Nunito',
    displayName: 'Nunito',
    category: 'sans-serif',
    weights: [200, 300, 400, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'raleway',
    family: 'Raleway',
    displayName: 'Raleway',
    category: 'sans-serif',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  // Serif
  {
    id: 'merriweather',
    family: 'Merriweather',
    displayName: 'Merriweather',
    category: 'serif',
    weights: [300, 400, 700, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'playfair-display',
    family: 'Playfair Display',
    displayName: 'Playfair Display',
    category: 'serif',
    weights: [400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'lora',
    family: 'Lora',
    displayName: 'Lora',
    category: 'serif',
    weights: [400, 500, 600, 700],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'pt-serif',
    family: 'PT Serif',
    displayName: 'PT Serif',
    category: 'serif',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'source-serif-4',
    family: 'Source Serif 4',
    displayName: 'Source Serif 4',
    category: 'serif',
    weights: [200, 300, 400, 600, 700, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  // Monospace
  {
    id: 'source-code-pro',
    family: 'Source Code Pro',
    displayName: 'Source Code Pro',
    category: 'monospace',
    weights: [200, 300, 400, 500, 600, 700, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'roboto-mono',
    family: 'Roboto Mono',
    displayName: 'Roboto Mono',
    category: 'monospace',
    weights: [100, 200, 300, 400, 500, 600, 700],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  // Handwriting
  {
    id: 'dancing-script',
    family: 'Dancing Script',
    displayName: 'Dancing Script',
    category: 'handwriting',
    weights: [400, 500, 600, 700],
    styles: ['normal'],
    supportedScripts: ['latin', 'vietnamese'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  {
    id: 'pacifico',
    family: 'Pacifico',
    displayName: 'Pacifico',
    category: 'handwriting',
    weights: [400],
    styles: ['normal'],
    supportedScripts: ['latin', 'cyrillic'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  // Display
  {
    id: 'oswald',
    family: 'Oswald',
    displayName: 'Oswald',
    category: 'display',
    weights: [200, 300, 400, 500, 600, 700],
    styles: ['normal'],
    supportedScripts: ['latin', 'cyrillic', 'vietnamese'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true
  },
  // Task 8.2 & 8.15: Metric-compatible stand-ins for standard & Microsoft fonts
  {
    id: 'liberation-sans',
    family: 'Liberation Sans',
    displayName: 'Liberation Sans',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek', 'hebrew'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true,
    metricCompatibleWith: ['Arial', 'Helvetica', 'Arimo']
  },
  {
    id: 'liberation-serif',
    family: 'Liberation Serif',
    displayName: 'Liberation Serif',
    category: 'serif',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek', 'hebrew'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true,
    metricCompatibleWith: ['Times New Roman', 'Times-Roman', 'Times', 'Tinos']
  },
  {
    id: 'liberation-mono',
    family: 'Liberation Mono',
    displayName: 'Liberation Mono',
    category: 'monospace',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true,
    metricCompatibleWith: ['Courier New', 'Courier', 'Cousine']
  },
  {
    id: 'carlito',
    family: 'Carlito',
    displayName: 'Carlito',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true,
    metricCompatibleWith: ['Calibri']
  },
  {
    id: 'caladea',
    family: 'Caladea',
    displayName: 'Caladea',
    category: 'serif',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'bundled',
    license: 'OFL',
    embeddable: true,
    metricCompatibleWith: ['Cambria']
  }
];

/**
 * Task 8.3: Noto fonts for worldwide script coverage (downloaded on demand)
 */
export const NOTO_SCRIPT_FONTS: FontCatalogEntry[] = [
  {
    id: 'noto-sans',
    family: 'Noto Sans',
    displayName: 'Noto Sans (Latin / Cyrillic / Greek)',
    category: 'sans-serif',
    weights: [100, 300, 400, 500, 700, 900],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSans-Regular.ttf',
    approxSizeBytes: 320000
  },
  {
    id: 'noto-serif',
    family: 'Noto Serif',
    displayName: 'Noto Serif (Latin / Cyrillic / Greek)',
    category: 'serif',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    supportedScripts: ['latin', 'cyrillic', 'greek'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSerif-Regular.ttf',
    approxSizeBytes: 340000
  },
  {
    id: 'noto-sans-arabic',
    family: 'Noto Sans Arabic',
    displayName: 'Noto Sans Arabic',
    category: 'sans-serif',
    weights: [300, 400, 600, 700],
    styles: ['normal'],
    supportedScripts: ['arabic'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansArabic-Regular.ttf',
    approxSizeBytes: 280000
  },
  {
    id: 'noto-sans-hebrew',
    family: 'Noto Sans Hebrew',
    displayName: 'Noto Sans Hebrew',
    category: 'sans-serif',
    weights: [300, 400, 600, 700],
    styles: ['normal'],
    supportedScripts: ['hebrew'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansHebrew-Regular.ttf',
    approxSizeBytes: 120000
  },
  {
    id: 'noto-sans-devanagari',
    family: 'Noto Sans Devanagari',
    displayName: 'Noto Sans Devanagari (Hindi)',
    category: 'sans-serif',
    weights: [400, 600, 700],
    styles: ['normal'],
    supportedScripts: ['devanagari'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansDevanagari-Regular.ttf',
    approxSizeBytes: 390000
  },
  {
    id: 'noto-sans-bengali',
    family: 'Noto Sans Bengali',
    displayName: 'Noto Sans Bengali',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['bengali'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansBengali-Regular.ttf',
    approxSizeBytes: 310000
  },
  {
    id: 'noto-sans-tamil',
    family: 'Noto Sans Tamil',
    displayName: 'Noto Sans Tamil',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['tamil'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansTamil-Regular.ttf',
    approxSizeBytes: 180000
  },
  {
    id: 'noto-sans-telugu',
    family: 'Noto Sans Telugu',
    displayName: 'Noto Sans Telugu',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['telugu'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansTelugu-Regular.ttf',
    approxSizeBytes: 190000
  },
  {
    id: 'noto-sans-kannada',
    family: 'Noto Sans Kannada',
    displayName: 'Noto Sans Kannada',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['kannada'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansKannada-Regular.ttf',
    approxSizeBytes: 195000
  },
  {
    id: 'noto-sans-malayalam',
    family: 'Noto Sans Malayalam',
    displayName: 'Noto Sans Malayalam',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['malayalam'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansMalayalam-Regular.ttf',
    approxSizeBytes: 210000
  },
  {
    id: 'noto-sans-gujarati',
    family: 'Noto Sans Gujarati',
    displayName: 'Noto Sans Gujarati',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['gujarati'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansGujarati-Regular.ttf',
    approxSizeBytes: 220000
  },
  {
    id: 'noto-sans-gurmukhi',
    family: 'Noto Sans Gurmukhi',
    displayName: 'Noto Sans Gurmukhi (Punjabi)',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['gurmukhi'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansGurmukhi-Regular.ttf',
    approxSizeBytes: 150000
  },
  {
    id: 'noto-sans-thai',
    family: 'Noto Sans Thai',
    displayName: 'Noto Sans Thai',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['thai'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansThai-Regular.ttf',
    approxSizeBytes: 130000
  },
  {
    id: 'noto-sans-cjk-sc',
    family: 'Noto Sans CJK SC',
    displayName: 'Noto Sans CJK SC (Simplified Chinese)',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['cjk', 'han', 'simplified-chinese'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansCJKsc-Regular.otf',
    approxSizeBytes: 1800000
  },
  {
    id: 'noto-sans-cjk-tc',
    family: 'Noto Sans CJK TC',
    displayName: 'Noto Sans CJK TC (Traditional Chinese)',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['cjk', 'han', 'traditional-chinese'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansCJKtc-Regular.otf',
    approxSizeBytes: 1850000
  },
  {
    id: 'noto-sans-cjk-jp',
    family: 'Noto Sans CJK JP',
    displayName: 'Noto Sans CJK JP (Japanese)',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['cjk', 'hiragana', 'katakana', 'japanese'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansCJKjp-Regular.otf',
    approxSizeBytes: 1800000
  },
  {
    id: 'noto-sans-cjk-kr',
    family: 'Noto Sans CJK KR',
    displayName: 'Noto Sans CJK KR (Korean)',
    category: 'sans-serif',
    weights: [400, 700],
    styles: ['normal'],
    supportedScripts: ['cjk', 'hangul', 'korean'],
    source: 'downloaded',
    license: 'OFL',
    embeddable: true,
    downloadUrl: '/fonts/noto/NotoSansCJKkr-Regular.otf',
    approxSizeBytes: 1750000
  }
];

/**
 * FontCatalog
 * Manages the collection of all available fonts, querying, filtering,
 * matching and recent list management.
 */
export class FontCatalog {
  private entries = new Map<string, FontCatalogEntry>();
  private recentFamilies: string[] = [];
  private static instance: FontCatalog | null = null;

  constructor() {
    // Populate starter bundled fonts
    for (const font of STARTER_BUNDLED_FONTS) {
      this.register(font);
    }
    // Populate script coverage fonts
    for (const font of NOTO_SCRIPT_FONTS) {
      this.register(font);
    }

    // Default recent fonts
    this.recentFamilies = ['Roboto', 'Liberation Sans', 'Inter', 'Merriweather'];
    this.loadRecentFromStorage();
  }

  static getInstance(): FontCatalog {
    if (!FontCatalog.instance) {
      FontCatalog.instance = new FontCatalog();
    }
    return FontCatalog.instance;
  }

  register(font: FontCatalogEntry): void {
    this.entries.set(font.family.toLowerCase(), font);
  }

  getAll(): FontCatalogEntry[] {
    return Array.from(this.entries.values());
  }

  getById(id: string): FontCatalogEntry | undefined {
    return this.getAll().find((f) => f.id.toLowerCase() === id.toLowerCase());
  }

  getByFamily(family: string): FontCatalogEntry | undefined {
    const clean = family
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .toLowerCase();
    return this.entries.get(clean);
  }

  /**
   * Filter fonts by search query, category, script and source
   */
  filter(options: FontFilterOptions): FontCatalogEntry[] {
    const query = (options.searchQuery || '').trim().toLowerCase();
    const category = options.category || 'all';
    const script = options.script || 'all';
    const source = options.source || 'all';

    return this.getAll().filter((font) => {
      // Category filter
      if (category !== 'all' && font.category !== category) {
        return false;
      }
      // Source filter
      if (source !== 'all' && font.source !== source) {
        return false;
      }
      // Script filter
      if (script !== 'all') {
        const matchesScript = font.supportedScripts.some(
          (s) => s.toLowerCase() === script.toLowerCase()
        );
        if (!matchesScript) return false;
      }
      // Text search query
      if (query) {
        const matchName = font.displayName.toLowerCase().includes(query);
        const matchFamily = font.family.toLowerCase().includes(query);
        const matchCompat = font.metricCompatibleWith?.some((c) => c.toLowerCase().includes(query));
        if (!matchName && !matchFamily && !matchCompat) return false;
      }
      return true;
    });
  }

  /**
   * Task 8.15: Smart font matching for non-embedded original PDF fonts
   * Maps Arial -> Liberation Sans, Times New Roman -> Liberation Serif,
   * Courier New -> Liberation Mono, Calibri -> Carlito, Cambria -> Caladea.
   */
  findMetricCompatible(originalFontName: string): {
    matchedEntry: FontCatalogEntry;
    isExact: boolean;
    isMetricEquivalent: boolean;
  } | null {
    const clean = originalFontName.trim().replace(/^['"]|['"]$/g, '');
    const cleanLower = clean.toLowerCase();

    // Check direct family match
    const direct = this.getByFamily(clean);
    if (direct) {
      return { matchedEntry: direct, isExact: true, isMetricEquivalent: false };
    }

    // Check metricCompatibleWith
    for (const entry of this.getAll()) {
      if (entry.metricCompatibleWith) {
        for (const compat of entry.metricCompatibleWith) {
          if (
            cleanLower.includes(compat.toLowerCase()) ||
            compat.toLowerCase().includes(cleanLower)
          ) {
            return {
              matchedEntry: entry,
              isExact: false,
              isMetricEquivalent: true
            };
          }
        }
      }
    }

    // Heuristic fallbacks:
    if (
      cleanLower.includes('helvetica') ||
      cleanLower.includes('arial') ||
      cleanLower.includes('sans')
    ) {
      const sans = this.getByFamily('Liberation Sans') || this.getByFamily('Roboto');
      if (sans) return { matchedEntry: sans, isExact: false, isMetricEquivalent: true };
    }
    if (
      cleanLower.includes('times') ||
      cleanLower.includes('roman') ||
      cleanLower.includes('serif')
    ) {
      const serif = this.getByFamily('Liberation Serif') || this.getByFamily('Merriweather');
      if (serif) return { matchedEntry: serif, isExact: false, isMetricEquivalent: true };
    }
    if (cleanLower.includes('courier') || cleanLower.includes('mono')) {
      const mono = this.getByFamily('Liberation Mono') || this.getByFamily('Roboto Mono');
      if (mono) return { matchedEntry: mono, isExact: false, isMetricEquivalent: true };
    }

    // Default to Liberation Sans / Roboto
    const fallback = this.getByFamily('Liberation Sans') || this.getByFamily('Roboto');
    if (fallback) {
      return { matchedEntry: fallback, isExact: false, isMetricEquivalent: false };
    }

    return null;
  }

  /**
   * Recent fonts management (Task 8.7)
   */
  getRecentFamilies(): string[] {
    return [...this.recentFamilies];
  }

  addRecentFont(family: string): void {
    const clean = family.trim().replace(/^['"]|['"]$/g, '');
    this.recentFamilies = [
      clean,
      ...this.recentFamilies.filter((f) => f.toLowerCase() !== clean.toLowerCase())
    ].slice(0, 8);
    this.saveRecentToStorage();
  }

  private loadRecentFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('rhypdf_recent_fonts');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list) && list.length > 0) {
            this.recentFamilies = list;
          }
        }
      }
    } catch {
      // Storage unavailable
    }
  }

  private saveRecentToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('rhypdf_recent_fonts', JSON.stringify(this.recentFamilies));
      }
    } catch {
      // Storage unavailable
    }
  }
}
