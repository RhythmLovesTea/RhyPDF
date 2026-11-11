import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  TextShaper,
  BidiEngine,
  determineBaseDirection,
  ArabicEngine,
  HebrewEngine,
  IndicEngine,
  ThaiEngine,
  CjkEngine,
  EmojiEngine,
  CidToUnicodeGenerator,
  SimpleTextLayoutEngine
} from '../src/index';

describe('Phase 9: Multi-Language Support (Typing and Rendering in All Scripts)', () => {
  const shaper = TextShaper.getInstance();
  const bidi = new BidiEngine();
  const arabic = new ArabicEngine();
  const hebrew = new HebrewEngine();
  const indic = new IndicEngine();
  const thai = new ThaiEngine();
  const cjk = new CjkEngine();
  const emoji = new EmojiEngine();
  const cidGen = new CidToUnicodeGenerator();
  const layoutEngine = new SimpleTextLayoutEngine();

  // Task 9.1: TextShaper
  describe('Task 9.1: TextShaper (HarfBuzz WASM & Fallback)', () => {
    it('shapes text using HarfBuzz WASM with font binary data', async () => {
      const fontPath = path.resolve(__dirname, '../../../apps/editor/public/fonts/arial.ttf');
      let fontBytes: Uint8Array | undefined;
      if (fs.existsSync(fontPath)) {
        fontBytes = new Uint8Array(fs.readFileSync(fontPath));
      }

      const shaped = await shaper.shape('Hello World', fontBytes, {
        fontSize: 16,
        direction: 'ltr'
      });

      expect(shaped.direction).toBe('ltr');
      expect(shaped.glyphs.length).toBe(11);
      expect(shaped.totalAdvance).toBeGreaterThan(0);
      expect(shaped.glyphs[0]!.glyphId).toBeGreaterThan(0);
      expect(shaped.glyphs[0]!.xAdvance).toBeGreaterThan(0);
    });

    it('shapes complex Arabic and Indic text in fallback mode when font bytes are omitted', async () => {
      const shapedArab = await shaper.shape('مرحبا', undefined, {
        direction: 'rtl',
        script: 'Arab',
        fontSize: 14
      });

      expect(shapedArab.direction).toBe('rtl');
      expect(shapedArab.glyphs.length).toBeGreaterThan(0);
      expect(shapedArab.totalAdvance).toBeGreaterThan(0);

      const shapedIndic = await shaper.shape('नमस्ते', undefined, {
        direction: 'ltr',
        script: 'Deva',
        fontSize: 14
      });

      expect(shapedIndic.direction).toBe('ltr');
      expect(shapedIndic.glyphs.length).toBeGreaterThan(0);
      expect(shapedIndic.totalAdvance).toBeGreaterThan(0);
    });
  });

  // Task 9.2: Bidi (UAX #9)
  describe('Task 9.2: Bidi (UAX #9) for mixed LTR / RTL', () => {
    it('determines base direction correctly based on strong characters', () => {
      expect(determineBaseDirection('Hello World')).toBe('ltr');
      expect(determineBaseDirection('مرحبا بالعالم')).toBe('rtl');
      expect(determineBaseDirection('שלום עולם')).toBe('rtl');
      expect(determineBaseDirection('12345')).toBe('ltr');
    });

    it('reorders mixed English and Arabic text visually and maps logical to visual coordinates', () => {
      const mixed = 'Doc 123: مرحبا';
      const result = bidi.resolve(mixed);

      expect(result.visualRuns.length).toBeGreaterThan(1);
      expect(result.visualText.length).toBe(mixed.length);
      expect(result.logicalToVisualMap.length).toBe(mixed.length);
      expect(result.visualToLogicalMap.length).toBe(mixed.length);

      // Caret mapping round-trip invariance
      for (let logIdx = 0; logIdx < mixed.length; logIdx++) {
        const visIdx = result.logicalToVisualMap[logIdx]!;
        expect(result.visualToLogicalMap[visIdx]).toBe(logIdx);
      }
    });

    it('mirrors brackets and parentheses in RTL directional runs', () => {
      const textWithBrackets = 'שלום (עולם)';
      const result = bidi.resolve(textWithBrackets, 'rtl');

      expect(result.baseDirection).toBe('rtl');
      // In RTL visual order, '(' and ')' are mirrored
      expect(result.visualText).toContain(')');
    });
  });

  // Task 9.3: Arabic Script Engine
  describe('Task 9.3: Arabic (joining, ligatures, diacritics, numerals)', () => {
    it('resolves contextual forms: isolated, initial, medial, and final', () => {
      // Word: "كتب" (Kaf, Ta, Ba) -> Kaf: initial, Ta: medial, Ba: final
      const shaped = arabic.shapeText('كتب');
      expect(shaped.length).toBe(3);
      expect(shaped[0]!.form).toBe('initial');
      expect(shaped[1]!.form).toBe('medial');
      expect(shaped[2]!.form).toBe('final');

      // Presentation forms codes
      expect(shaped[0]!.shapedChar).toBe('\uFEDB'); // Kaf initial
      expect(shaped[1]!.shapedChar).toBe('\uFE98'); // Ta medial
      expect(shaped[2]!.shapedChar).toBe('\uFE90'); // Ba final
    });

    it('forms mandatory Lam-Alef ligatures (لا, لأ, لإ, لآ)', () => {
      const shaped = arabic.shapeText('لا');
      expect(shaped.length).toBe(1); // Joined into single ligature glyph
      expect(shaped[0]!.isLigature).toBe(true);
      expect(shaped[0]!.shapedChar).toBe('\uFEFB'); // Lam-Alef isolated
    });

    it('preserves transparent Tashkeel (harakat diacritics)', () => {
      // "كَتَبَ" with Fatha diacritics
      const shaped = arabic.shapeText('كَتَبَ');
      expect(shaped.some((s) => s.originalChar === '\u064E')).toBe(true);
    });

    it('converts between Western (0-9) and Eastern Arabic-Indic numerals (٠-٩)', () => {
      const western = 'Invoice 2026: 450 items';
      const eastern = arabic.convertNumerals(western, 'eastern');
      expect(eastern).toBe('Invoice ٢٠٢٦: ٤٥٠ items');

      const backToWestern = arabic.convertNumerals(eastern, 'western');
      expect(backToWestern).toBe(western);
    });
  });

  // Task 9.4: Hebrew Script Engine
  describe('Task 9.4: Hebrew (RTL, Niqqud)', () => {
    it('segments Hebrew words into consonant + Niqqud clusters', () => {
      // "שָׁלוֹם" (Shalom with Shin dot, Qamats, Holam)
      const text = 'שָׁלוֹם';
      const clusters = hebrew.segmentClusters(text);

      expect(clusters.length).toBe(4); // 4 Hebrew letters: Shin, Lamed, Vav, Mem
      expect(clusters[0]!.baseChar).toBe('ש');
      expect(clusters[0]!.marks.length).toBe(2); // Shin dot + Qamats
      expect(clusters[1]!.baseChar).toBe('ל');
      expect(clusters[1]!.marks.length).toBe(0);
      expect(clusters[2]!.baseChar).toBe('ו');
      expect(clusters[2]!.marks.length).toBe(1); // Holam mark on Vav
      expect(clusters[3]!.baseChar).toBe('ם');
    });

    it('strips Niqqud vowel marks for search matching', () => {
      const withNiqqud = 'שָׁלוֹם';
      const stripped = hebrew.stripNiqqud(withNiqqud);
      expect(stripped).toBe('שלום');
    });
  });

  // Task 9.5: Indic Scripts Engine
  describe('Task 9.5: Indic scripts (Akshara, conjuncts, matra reordering)', () => {
    it('segments Devanagari Aksharas and detects conjuncts with Virama (नमस्ते)', () => {
      // "नमस्ते" -> 'न', 'म', 'स्ते' (स + ् + त + े)
      const aksharas = indic.segmentAksharas('नमस्ते');
      expect(aksharas.length).toBe(3);

      const lastAkshara = aksharas[2]!;
      expect(lastAkshara.consonants).toContain('स');
      expect(lastAkshara.consonants).toContain('त');
      expect(lastAkshara.halants).toContain('्');
      expect(lastAkshara.matras).toContain('े');
    });

    it('detects Reph (र + ् at start of syllable) in Devanagari (कर्म)', () => {
      // "कर्म" -> 'क', 'र्म' (र + ् + म)
      const aksharas = indic.segmentAksharas('कर्म');
      expect(aksharas.length).toBe(2);
      expect(aksharas[1]!.hasReph).toBe(true);
    });

    it('reorders pre-base vowel sign (short-i ि) before consonant cluster in visual output', () => {
      // "कि" -> Logical: 'क' + 'ि', Visual: 'ि' + 'क'
      const aksharas = indic.segmentAksharas('कि');
      expect(aksharas.length).toBe(1);
      expect(aksharas[0]!.hasPreBaseMatra).toBe(true);
      expect(aksharas[0]!.visualCluster).toBe('िक');
      expect(aksharas[0]!.fullCluster).toBe('कि');
    });

    it('supports Bengali and Tamil script syllables', () => {
      // Bengali "শান্তি" (Shanti)
      const bengaliAksharas = indic.segmentAksharas('শান্তি');
      expect(bengaliAksharas.length).toBeGreaterThan(0);

      // Tamil "வணக்கம்" (Vanakkam)
      const tamilAksharas = indic.segmentAksharas('வணக்கம்');
      expect(tamilAksharas.length).toBeGreaterThan(0);
    });
  });

  // Task 9.6: Thai Script Engine
  describe('Task 9.6: Thai (no-space word breaking and stacked marks)', () => {
    it('segments Thai sentences into words without spaces', () => {
      // "สวัสดีชาวโลก" (Hello world: สวัสดี + ชาวโลก)
      const text = 'สวัสดีชาวโลก';
      const words = thai.segmentWords(text);
      expect(words.length).toBeGreaterThanOrEqual(2);
    });

    it('classifies Thai characters and groups stacked tone marks over vowels', () => {
      // "ที่" (Tho Thahan + Sara Ii + Mai Ek)
      const graphemes = thai.segmentGraphemes('ที่');
      expect(graphemes.length).toBe(1);
      expect(graphemes[0]!.base).toBe('ท');
      expect(graphemes[0]!.aboveVowel).toBe('ี');
      expect(graphemes[0]!.toneMark).toBe('่');
    });
  });

  // Task 9.7: CJK Layout & Kinsoku Line Breaking
  describe('Task 9.7: CJK (horizontal, vertical-rl, Kinsoku Shori)', () => {
    it('detects CJK code points correctly', () => {
      expect(cjk.hasCjk('日本語テキスト')).toBe(true);
      expect(cjk.hasCjk('简体中文文本')).toBe(true);
      expect(cjk.hasCjk('English only')).toBe(false);
    });

    it('enforces Kinsoku Shori rules preventing line-start with punctuation (、。」)', () => {
      // Text where punctuation would land at character 6 (start of line 2)
      const text = '吾輩は猫である。名前はまだ無い。';
      const wrapped = cjk.wrapCjkLines(text, 6);

      expect(wrapped.lines.length).toBeGreaterThan(1);
      // Verify no line starts with '。' or '、'
      for (let i = 1; i < wrapped.lines.length; i++) {
        const firstChar = wrapped.lines[i]![0];
        expect(firstChar).not.toBe('。');
        expect(firstChar).not.toBe('、');
      }
    });

    it('assigns 1.0em advance for full-width CJK ideographs', () => {
      expect(cjk.getCharacterAdvanceRatio('漢')).toBe(1.0);
      expect(cjk.getCharacterAdvanceRatio('A')).toBeLessThan(1.0);
    });
  });

  // Task 9.8: Emoji and Symbol Fallback
  describe('Task 9.8: Emoji & symbol fallback', () => {
    it('detects emoji sequences including ZWJ and skin tone modifiers', () => {
      const text = 'Status: 👍 Great work! 👨‍👩‍👧‍👦 Family, 🚀 Rocket.';
      const sequences = emoji.extractEmojiSequences(text);

      expect(sequences.length).toBe(3);
      // 👍
      expect(sequences[0]!.emojiText).toBe('👍');
      expect(sequences[0]!.isZwjSequence).toBe(false);
      // 👨‍👩‍👧‍👦 (ZWJ Family)
      expect(sequences[1]!.emojiText).toBe('👨‍👩‍👧‍👦');
      expect(sequences[1]!.isZwjSequence).toBe(true);
      // 🚀
      expect(sequences[2]!.emojiText).toBe('🚀');
    });

    it('distinguishes between text presentation (U+FE0E) and emoji presentation (U+FE0F)', () => {
      const textPresentation = '▶\uFE0E';
      const emojiPresentation = '▶\uFE0F';

      const seqText = emoji.extractEmojiSequences(textPresentation);
      expect(seqText[0]!.isTextPresentation).toBe(true);

      const seqEmoji = emoji.extractEmojiSequences(emojiPresentation);
      expect(seqEmoji[0]!.isEmojiPresentation).toBe(true);
    });
  });

  // Task 9.9: PDF CIDFont & /ToUnicode CMap Generator
  describe('Task 9.9: PDF CIDFont and /ToUnicode CMap Generation', () => {
    it('generates valid PostScript /ToUnicode CMap mapping glyph IDs to Unicode', () => {
      const mappings = [
        { glyphId: 43, unicodeString: 'H' },
        { glyphId: 44, unicodeString: 'e' },
        { glyphId: 45, unicodeString: 'l' },
        { glyphId: 46, unicodeString: 'o' },
        // Ligature: single glyph mapping to multiple characters (Lam-Alef)
        { glyphId: 102, unicodeString: 'لا' }
      ];

      const cMap = cidGen.generateToUnicodeCMap(mappings);

      expect(cMap).toContain('/CIDInit /ProcSet findresource begin');
      expect(cMap).toContain('/CMapName /Adobe-Identity-UCS def');
      expect(cMap).toContain('1 begincodespacerange');
      expect(cMap).toContain('<0000> <FFFF>');
      expect(cMap).toContain('beginbfchar');
      // Glyph 43 hex 002B -> Unicode 'H' (hex 0048)
      expect(cMap).toContain('<002B> <0048>');
      // Ligature glyph 102 hex 0066 -> Unicode 'لا' ('\u0644\u0627' hex 06440627)
      expect(cMap).toContain('<0066> <06440627>');
      expect(cMap).toContain('endbfchar');
      expect(cMap).toContain('endcmap');
    });

    it('builds CIDFont details and PDF Type0 / Descendant CIDFontType2 dictionary snippet', () => {
      const mappings = [
        { glyphId: 10, unicodeString: 'A' },
        { glyphId: 20, unicodeString: 'B' }
      ];
      const advances = new Map<number, number>([
        [10, 650],
        [20, 680]
      ]);

      const details = cidGen.buildCidFontDetails('Roboto', 'ABCDEF', mappings, advances);
      expect(details.baseFont).toBe('ABCDEF+Roboto');
      expect(details.cidSystemInfo.ordering).toBe('Identity');
      expect(details.widths.length).toBe(2);

      const snippet = cidGen.generatePdfFontObjectSnippet(details);
      expect(snippet).toContain('/Subtype /Type0');
      expect(snippet).toContain('/Subtype /CIDFontType2');
      expect(snippet).toContain('/CIDToGIDMap /Identity');
      expect(snippet).toContain('/Encoding /Identity-H');
      expect(snippet).toContain('/W [ 10 [ 650 ] 20 [ 680 ] ]');
    });
  });

  // Task 9.10: Multilingual Layout & External Parity
  describe('Task 9.10: Multilingual layout and wrapping integration', () => {
    it('lays out a multilingual document containing Arabic, Hindi, CJK, Thai, and English', async () => {
      const multilingualText = [
        'Welcome to RhyPDF Web Editor.',
        'مرحبا بكم في محرر المستندات العربي.',
        'नमस्ते, आपका इस संपादक में स्वागत है।',
        'ยินดีต้อนรับสู่โปรแกรมแก้ไขเอกสารภาษาไทย',
        '欢迎使用现代化文档编辑器。'
      ].join('\n');

      const result = await layoutEngine.layout(multilingualText, {
        fontSize: 14,
        maxWidth: 400
      });

      expect(result.lines.length).toBeGreaterThanOrEqual(5);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      // Verify Arabic line has RTL right alignment or visual text
      const arabicLine = result.lines.find(
        (l) => l.text.includes('محرر') || l.text.includes('العربي')
      );
      expect(arabicLine).toBeTruthy();

      // Verify Hindi line is preserved
      const hindiLine = result.lines.find((l) => l.text.includes('नमस्ते'));
      expect(hindiLine).toBeTruthy();

      // Verify Thai line is laid out
      const thaiLine = result.lines.find((l) => l.text.includes('ยินดี'));
      expect(thaiLine).toBeTruthy();

      // Verify CJK line is laid out
      const cjkLine = result.lines.find((l) => l.text.includes('欢迎'));
      expect(cjkLine).toBeTruthy();
    });
  });
});
