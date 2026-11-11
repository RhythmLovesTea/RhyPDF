import { describe, it, expect } from 'vitest';
import {
  FontCatalog,
  STARTER_BUNDLED_FONTS,
  NOTO_SCRIPT_FONTS,
  parseFsType,
  parseFontBuffer,
  generateRandomSubsetTag,
  subsetFont,
  classifyCodePoint,
  splitTextIntoScriptSegments,
  importFontFromDevice
} from '../src/index';

describe('Phase 8: FontCatalog, OpenType Parsing, Subsetting & Typography Subsystem', () => {
  describe('Task 8.1, 8.2, 8.3: FontCatalog and starter open-license fonts', () => {
    const catalog = FontCatalog.getInstance();

    it('initializes with all starter bundled fonts and Noto script fonts', () => {
      const allFonts = catalog.getAll();
      expect(allFonts.length).toBeGreaterThanOrEqual(
        STARTER_BUNDLED_FONTS.length + NOTO_SCRIPT_FONTS.length
      );

      // Verify essential open-license families exist
      expect(catalog.getByFamily('Roboto')).toBeDefined();
      expect(catalog.getByFamily('Open Sans')).toBeDefined();
      expect(catalog.getByFamily('Inter')).toBeDefined();
      expect(catalog.getByFamily('Merriweather')).toBeDefined();
      expect(catalog.getByFamily('Liberation Sans')).toBeDefined();
      expect(catalog.getByFamily('Carlito')).toBeDefined();
      expect(catalog.getByFamily('Caladea')).toBeDefined();
    });

    it('filters fonts by category, script, source, and search query', () => {
      // Category filter
      const sansFonts = catalog.filter({ category: 'sans-serif' });
      expect(sansFonts.every((f) => f.category === 'sans-serif')).toBe(true);

      const serifFonts = catalog.filter({ category: 'serif' });
      expect(serifFonts.every((f) => f.category === 'serif')).toBe(true);

      // Script filter
      const arabicFonts = catalog.filter({ script: 'arabic' });
      expect(arabicFonts.some((f) => f.family.includes('Arabic'))).toBe(true);

      // Search query
      const robotoMatches = catalog.filter({ searchQuery: 'roboto' });
      expect(robotoMatches.length).toBeGreaterThanOrEqual(2); // Roboto, Roboto Mono
    });

    it('tracks and persists recent font families (Task 8.7)', () => {
      catalog.addRecentFont('Pacifico');
      const recents = catalog.getRecentFamilies();
      expect(recents[0]).toBe('Pacifico');
    });
  });

  describe('Task 8.15: Smart metric-compatible font matching', () => {
    const catalog = FontCatalog.getInstance();

    it('matches Microsoft/Standard fonts to metric-compatible open equivalents', () => {
      // Arial -> Liberation Sans
      const arialMatch = catalog.findMetricCompatible('Arial');
      expect(arialMatch).not.toBeNull();
      expect(arialMatch!.matchedEntry.family).toBe('Liberation Sans');
      expect(arialMatch!.isMetricEquivalent).toBe(true);

      // Helvetica -> Liberation Sans
      const helvMatch = catalog.findMetricCompatible('Helvetica');
      expect(helvMatch).not.toBeNull();
      expect(helvMatch!.matchedEntry.family).toBe('Liberation Sans');

      // Times New Roman -> Liberation Serif
      const timesMatch = catalog.findMetricCompatible('Times New Roman');
      expect(timesMatch).not.toBeNull();
      expect(timesMatch!.matchedEntry.family).toBe('Liberation Serif');

      // Calibri -> Carlito
      const calibriMatch = catalog.findMetricCompatible('Calibri');
      expect(calibriMatch).not.toBeNull();
      expect(calibriMatch!.matchedEntry.family).toBe('Carlito');

      // Cambria -> Caladea
      const cambriaMatch = catalog.findMetricCompatible('Cambria');
      expect(cambriaMatch).not.toBeNull();
      expect(cambriaMatch!.matchedEntry.family).toBe('Caladea');

      // Courier New -> Liberation Mono
      const courierMatch = catalog.findMetricCompatible('Courier New');
      expect(courierMatch).not.toBeNull();
      expect(courierMatch!.matchedEntry.family).toBe('Liberation Mono');
    });

    it('returns exact match when family name is identical', () => {
      const match = catalog.findMetricCompatible('Roboto');
      expect(match).not.toBeNull();
      expect(match!.matchedEntry.family).toBe('Roboto');
      expect(match!.isExact).toBe(true);
    });
  });

  describe('Task 8.6: OpenType fsType permission checks & font import', () => {
    it('correctly interprets fsType bit flags', () => {
      // 0x0000: Installable embedding
      const installable = parseFsType(0x0000);
      expect(installable.isInstallable).toBe(true);
      expect(installable.embeddableForEditing).toBe(true);
      expect(installable.isRestricted).toBe(false);

      // 0x0008: Editable embedding
      const editable = parseFsType(0x0008);
      expect(editable.isEditable).toBe(true);
      expect(editable.embeddableForEditing).toBe(true);

      // 0x0002: Restricted license (must not be embedded)
      const restricted = parseFsType(0x0002);
      expect(restricted.isRestricted).toBe(true);
      expect(restricted.embeddableForEditing).toBe(false);

      // 0x0004: Preview and print only
      const previewOnly = parseFsType(0x0004);
      expect(previewOnly.isPreviewPrintOnly).toBe(true);
      expect(previewOnly.embeddableForEditing).toBe(false);

      // 0x0100: No subsetting
      const noSubset = parseFsType(0x0108); // Editable + No Subsetting
      expect(noSubset.noSubsetting).toBe(true);
      expect(noSubset.embeddableForEditing).toBe(true);
    });

    it('blocks import of fonts with restricted embedding (fsType 0x0002)', async () => {
      // Create synthetic mock font buffer with 0x0002 restricted fsType
      const mockBuf = createMockSfntFont({ fsType: 0x0002, family: 'RestrictedFont' });

      await expect(importFontFromDevice(mockBuf)).rejects.toThrow(
        /License restriction \(fsType 0x0002 Restricted License embedding\)/
      );
    });

    it('successfully imports unrestricted fonts into catalog', async () => {
      const mockBuf = createMockSfntFont({ fsType: 0x0000, family: 'MyCustomFont' });
      const result = await importFontFromDevice(mockBuf);

      expect(result.entry.family).toBe('MyCustomFont');
      expect(result.entry.source).toBe('user');
      expect(result.entry.embeddable).toBe(true);

      const inCatalog = FontCatalog.getInstance().getByFamily('MyCustomFont');
      expect(inCatalog).toBeDefined();
    });
  });

  describe('Task 8.13: Font Subsetting & Tag generation', () => {
    it('generates standard 6-character uppercase subset tags (e.g. ABCDEF)', () => {
      const tag1 = generateRandomSubsetTag();
      const tag2 = generateRandomSubsetTag();

      expect(tag1).toHaveLength(6);
      expect(tag2).toHaveLength(6);
      expect(/^[A-Z]{6}$/.test(tag1)).toBe(true);
      expect(/^[A-Z]{6}$/.test(tag2)).toBe(true);
    });

    it('subsets font containing only used glyphs with proper prefix tag', async () => {
      const mockBuf = createMockSfntFont({ fsType: 0x0000, family: 'SubsetFont' });
      const res = await subsetFont(mockBuf, 'Hello World', { customTag: 'RHYPDF' });

      expect(res.subsetTag).toBe('RHYPDF');
      expect(res.subsetFontName).toContain('RHYPDF+');
      expect(res.isFullEmbed).toBe(false);
      expect(res.fontData.byteLength).toBeGreaterThan(0);
    });

    it('forces full embed without subsetting if fsType has noSubsetting bit (0x0100)', async () => {
      const mockBuf = createMockSfntFont({ fsType: 0x0100, family: 'NoSubsetFont' });
      const res = await subsetFont(mockBuf, 'Test');

      expect(res.isFullEmbed).toBe(true);
      expect(res.fontData.byteLength).toBe(mockBuf.byteLength);
    });
  });

  describe('Task 8.17: Script classification & automatic fallback chains', () => {
    it('classifies Unicode characters into correct scripts', () => {
      expect(classifyCodePoint('A'.charCodeAt(0))).toBe('latin');
      expect(classifyCodePoint('Я'.charCodeAt(0))).toBe('cyrillic');
      expect(classifyCodePoint('Ω'.charCodeAt(0))).toBe('greek');
      expect(classifyCodePoint('م'.charCodeAt(0))).toBe('arabic');
      expect(classifyCodePoint('ש'.charCodeAt(0))).toBe('hebrew');
      expect(classifyCodePoint('न'.charCodeAt(0))).toBe('devanagari');
      expect(classifyCodePoint('ব'.charCodeAt(0))).toBe('bengali');
      expect(classifyCodePoint('த'.charCodeAt(0))).toBe('tamil');
      expect(classifyCodePoint('ก'.charCodeAt(0))).toBe('thai');
      expect(classifyCodePoint('中'.charCodeAt(0))).toBe('cjk');
      expect(classifyCodePoint(' '.charCodeAt(0))).toBe('common');
      expect(classifyCodePoint('1'.charCodeAt(0))).toBe('common');
    });

    it('splits multilingual text into script segments with appropriate fallback fonts', () => {
      const text = 'English Latin مرحبا بالعالم नमस्ते';
      const segments = splitTextIntoScriptSegments(text, 'Roboto');

      expect(segments.length).toBeGreaterThanOrEqual(3);

      // Latin segment
      expect(segments[0]!.script).toBe('latin');
      expect(segments[0]!.fontFamily).toBe('Roboto');
      expect(segments[0]!.isFallback).toBe(false);

      // Arabic segment
      const arabicSeg = segments.find((s) => s.script === 'arabic');
      expect(arabicSeg).toBeDefined();
      expect(arabicSeg!.fontFamily).toBe('Noto Sans Arabic');
      expect(arabicSeg!.isFallback).toBe(true);

      // Devanagari segment
      const devanagariSeg = segments.find((s) => s.script === 'devanagari');
      expect(devanagariSeg).toBeDefined();
      expect(devanagariSeg!.fontFamily).toBe('Noto Sans Devanagari');
      expect(devanagariSeg!.isFallback).toBe(true);
    });
  });
});

/**
 * Helper to construct a synthetic valid sfnt/TrueType font binary buffer
 * containing head, OS/2, and name tables with customizable fsType.
 */
function createMockSfntFont(options: { fsType: number; family: string }): Uint8Array {
  // We construct a minimal valid OpenType directory:
  // 12 bytes header + 3 tables (head: 54, OS/2: 96, name: 60)
  const headSize = 54;
  const os2Size = 96;
  const nameSize = 80;

  const headerSize = 12 + 3 * 16;
  const headOffset = headerSize;
  const os2Offset = headOffset + headSize;
  const nameOffset = os2Offset + os2Size;
  const totalSize = nameOffset + nameSize;

  const buf = new Uint8Array(totalSize);
  const dv = new DataView(buf.buffer);

  // sfntVersion: 0x00010000 (TrueType)
  dv.setUint32(0, 0x00010000, false);
  dv.setUint16(4, 3, false); // 3 tables

  // Table 1: 'head'
  setTag(buf, 12, 'head');
  dv.setUint32(20, headOffset, false);
  dv.setUint32(24, headSize, false);

  // Table 2: 'OS/2'
  setTag(buf, 28, 'OS/2');
  dv.setUint32(36, os2Offset, false);
  dv.setUint32(40, os2Size, false);
  // OS/2 contents:
  // offset 4: usWeightClass
  dv.setUint16(os2Offset + 4, 400, false);
  // offset 8: fsType
  dv.setUint16(os2Offset + 8, options.fsType, false);
  // offset 62: fsSelection
  dv.setUint16(os2Offset + 62, 0x0040, false); // regular

  // Table 3: 'name'
  setTag(buf, 44, 'name');
  dv.setUint32(52, nameOffset, false);
  dv.setUint32(56, nameSize, false);
  // name table contents:
  // format 0
  dv.setUint16(nameOffset, 0, false);
  dv.setUint16(nameOffset + 2, 1, false); // 1 name record
  const strOffset = 6 + 12; // string storage after records
  dv.setUint16(nameOffset + 4, strOffset, false);

  // Record 0: platformID 3, encodingID 1, languageID 0x0409, nameID 1 (Font Family)
  const recOffset = nameOffset + 6;
  dv.setUint16(recOffset, 3, false);
  dv.setUint16(recOffset + 2, 1, false);
  dv.setUint16(recOffset + 4, 0x0409, false);
  dv.setUint16(recOffset + 6, 1, false); // family name
  dv.setUint16(recOffset + 8, options.family.length * 2, false); // utf16 length
  dv.setUint16(recOffset + 10, 0, false); // string offset

  // Write UTF-16BE family name into string pool
  const strStart = nameOffset + strOffset;
  for (let c = 0; c < options.family.length; c++) {
    dv.setUint16(strStart + c * 2, options.family.charCodeAt(c), false);
  }

  return buf;
}

function setTag(buf: Uint8Array, offset: number, tag: string) {
  for (let i = 0; i < 4; i++) {
    buf[offset + i] = tag.charCodeAt(i);
  }
}
