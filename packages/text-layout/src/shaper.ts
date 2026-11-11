/**
 * @rhypdf/text-layout - TextShaper Engine (Task 9.1)
 * Uses HarfBuzz (via harfbuzzjs WASM) to shape text into positioned glyph IDs,
 * advances, offsets, and clusters for any script, with fallback logic.
 */

import * as hb from 'harfbuzzjs';
import type { TextDirection, ShapedGlyph, ShapedRun } from './index';
import { ArabicEngine } from './arabic';
import { IndicEngine } from './indic';
import { HebrewEngine } from './hebrew';

export interface ShaperOptions {
  direction?: TextDirection;
  script?: string;
  language?: string;
  fontSize?: number;
  features?: string[];
}

interface CachedHarfBuzzFont {
  blob: hb.Blob;
  face: hb.Face;
  font: hb.Font;
  upem: number;
}

const arabicEngine = new ArabicEngine();
const indicEngine = new IndicEngine();
const hebrewEngine = new HebrewEngine();

/**
 * TextShaper
 * Shapes complex scripts (Arabic, Indic, Hebrew, Thai, CJK, Latin) into glyph sequences.
 */
export class TextShaper {
  private static instance: TextShaper | null = null;
  private fontCache = new Map<string, CachedHarfBuzzFont>();

  static getInstance(): TextShaper {
    if (!TextShaper.instance) {
      TextShaper.instance = new TextShaper();
    }
    return TextShaper.instance;
  }

  /**
   * Hashes font data buffer to use as cache key.
   */
  private getBufferHash(buf: Uint8Array): string {
    let hash = 0;
    const len = Math.min(buf.length, 512);
    for (let i = 0; i < len; i++) {
      hash = (hash * 31 + buf[i]!) | 0;
    }
    return `font-${buf.length}-${hash}`;
  }

  /**
   * Reads unitsPerEm from the OpenType 'head' table.
   */
  private getUnitsPerEm(fontData: Uint8Array): number {
    try {
      if (fontData.length < 12) return 1000;
      const view = new DataView(fontData.buffer, fontData.byteOffset, fontData.byteLength);
      const numTables = view.getUint16(4, false);

      let offset = 12;
      for (let i = 0; i < numTables; i++) {
        const tag = String.fromCharCode(
          view.getUint8(offset),
          view.getUint8(offset + 1),
          view.getUint8(offset + 2),
          view.getUint8(offset + 3)
        );
        const tableOffset = view.getUint32(offset + 8, false);

        if (tag === 'head') {
          // unitsPerEm is at offset 18 within 'head'
          return view.getUint16(tableOffset + 18, false) || 1000;
        }
        offset += 16;
      }
    } catch {
      // Fallback
    }
    return 1000;
  }

  /**
   * Gets or creates HarfBuzz Font from font binary bytes.
   */
  private getOrCreateFont(fontData: Uint8Array): CachedHarfBuzzFont {
    const key = this.getBufferHash(fontData);
    let cached = this.fontCache.get(key);
    if (!cached) {
      const blob = new hb.Blob(fontData);
      const face = new hb.Face(blob, 0);
      const font = new hb.Font(face);
      const upem = this.getUnitsPerEm(fontData);
      cached = { blob, face, font, upem };
      this.fontCache.set(key, cached);
    }
    return cached;
  }

  /**
   * Shapes text using HarfBuzz WASM with fallback.
   */
  async shape(text: string, fontData?: Uint8Array, options?: ShaperOptions): Promise<ShapedRun> {
    return this.shapeSync(text, fontData, options);
  }

  /**
   * Synchronous shaping execution.
   */
  shapeSync(text: string, fontData?: Uint8Array, options?: ShaperOptions): ShapedRun {
    const direction = options?.direction || 'ltr';
    const fontSize = options?.fontSize || 12;
    const script = options?.script || 'Latn';

    // If font data is available, shape with HarfBuzz
    if (fontData && fontData.length > 0) {
      try {
        const { font, upem } = this.getOrCreateFont(fontData);
        const buffer = new hb.Buffer();
        buffer.addText(text);

        if (direction === 'rtl') {
          buffer.setDirection(hb.Direction.RTL);
        } else {
          buffer.setDirection(hb.Direction.LTR);
        }

        if (options?.script) {
          buffer.setScript(options.script);
        }
        if (options?.language) {
          buffer.setLanguage(options.language);
        }

        buffer.guessSegmentProperties();

        // Run HarfBuzz shaping
        const hbFeatures = options?.features?.map((f) => new hb.Feature(f));
        hb.shape(font, buffer, hbFeatures);

        const items = buffer.getGlyphInfosAndPositions();
        const scale = fontSize / upem;
        const glyphs: ShapedGlyph[] = [];
        let totalAdvance = 0;

        for (let i = 0; i < items.length; i++) {
          const it = items[i]!;
          const xAdv = (it.xAdvance ?? 0) * scale;
          const yAdv = (it.yAdvance ?? 0) * scale;
          const xOff = (it.xOffset ?? 0) * scale;
          const yOff = (it.yOffset ?? 0) * scale;

          glyphs.push({
            glyphId: it.codepoint,
            cluster: it.cluster,
            xAdvance: xAdv,
            yAdvance: yAdv,
            xOffset: xOff,
            yOffset: yOff
          });

          totalAdvance += xAdv;
        }

        return {
          direction,
          script,
          language: options?.language,
          glyphs,
          totalAdvance,
          unitsPerEm: upem
        };
      } catch (e) {
        console.warn('[TextShaper] HarfBuzz shaping exception, falling back to script shaper:', e);
      }
    }

    // Fallback Shaper: script-aware cluster formation
    return this.fallbackShape(text, fontSize, direction, script, options?.language);
  }

  /**
   * Fallback shaper when raw font data is unavailable or HarfBuzz is bypassed.
   */
  private fallbackShape(
    text: string,
    fontSize: number,
    direction: TextDirection,
    script: string,
    language?: string
  ): ShapedRun {
    const glyphs: ShapedGlyph[] = [];
    let totalAdvance = 0;

    // Check script characteristics
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
    const hasIndic = /[\u0900-\u0D7F]/.test(text);
    const hasHebrew = /[\u0590-\u05FF]/.test(text);

    if (hasArabic) {
      const shaped = arabicEngine.shapeText(text);
      for (const s of shaped) {
        const cp = s.shapedChar.codePointAt(0)!;
        // Diacritics have zero advance
        const isTashkeel = cp >= 0x064b && cp <= 0x065f;
        const adv = isTashkeel ? 0 : fontSize * 0.55;

        glyphs.push({
          glyphId: cp,
          cluster: s.originalIndex,
          xAdvance: adv,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        });
        totalAdvance += adv;
      }
    } else if (hasIndic) {
      const aksharas = indicEngine.segmentAksharas(text);
      for (const ak of aksharas) {
        // Syllable cluster advance
        const charCount = ak.consonants.length + ak.matras.length;
        const adv = Math.max(fontSize * 0.6, charCount * fontSize * 0.45);

        for (let k = 0; k < ak.visualCluster.length; k++) {
          const ch = ak.visualCluster[k]!;
          const cp = ch.codePointAt(0)!;
          const isMatra = k > 0;
          const glyphAdv = isMatra ? 0 : adv;

          glyphs.push({
            glyphId: cp,
            cluster: ak.originalStart,
            xAdvance: glyphAdv,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0
          });
        }
        totalAdvance += adv;
      }
    } else if (hasHebrew) {
      const clusters = hebrewEngine.segmentClusters(text);
      for (const cl of clusters) {
        const adv = fontSize * 0.5;
        const cp = cl.baseChar.codePointAt(0) || cl.fullCluster.codePointAt(0)!;

        glyphs.push({
          glyphId: cp,
          cluster: cl.originalIndex,
          xAdvance: adv,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        });
        totalAdvance += adv;
      }
    } else {
      // Standard Latin / CJK
      const chars = Array.from(text);
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i]!;
        const cp = ch.codePointAt(0)!;
        const isCjk = (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3040 && cp <= 0x30ff);
        const adv = isCjk ? fontSize * 1.0 : ch === ' ' ? fontSize * 0.28 : fontSize * 0.55;

        glyphs.push({
          glyphId: cp,
          cluster: i,
          xAdvance: adv,
          yAdvance: 0,
          xOffset: 0,
          yOffset: 0
        });
        totalAdvance += adv;
      }
    }

    return {
      direction,
      script,
      language,
      glyphs,
      totalAdvance,
      unitsPerEm: 1000
    };
  }
}
