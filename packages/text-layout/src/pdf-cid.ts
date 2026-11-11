/**
 * @rhypdf/text-layout - PDF CIDFont & /ToUnicode CMap Generator (Task 9.9)
 * Generates PostScript /ToUnicode CMap streams and CIDFontType2 dictionary structures
 * ensuring shaped complex scripts (Arabic, Indic, Hebrew, Thai, CJK) remain
 * 100% searchable, copyable, and extractable in external PDF viewers without ghost text.
 */

export interface CidMapping {
  glyphId: number;
  unicodeString: string;
}

export interface CidFontDetails {
  baseFont: string;
  cidSystemInfo: {
    registry: string;
    ordering: string;
    supplement: number;
  };
  toUnicodeStream: string;
  widths: Array<{ cid: number; width: number }>;
}

/**
 * Encodes a Unicode string to hex sequence for PostScript ToUnicode CMap.
 */
function stringToHexUtf16BE(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hex += code.toString(16).padStart(4, '0');
  }
  return hex;
}

/**
 * Generator for PostScript /ToUnicode CMaps and CIDFont structures.
 */
export class CidToUnicodeGenerator {
  /**
   * Generates a standard Adobe /ToUnicode PostScript stream from glyph-to-Unicode mappings.
   */
  generateToUnicodeCMap(mappings: CidMapping[]): string {
    const sorted = [...mappings].sort((a, b) => a.glyphId - b.glyphId);

    // Filter valid mappings
    const valid = sorted.filter((m) => m.glyphId >= 0 && m.unicodeString.length > 0);

    // Chunk into beginbfchar blocks (max 100 entries per block per PDF specification)
    const blocks: string[] = [];
    const chunkSize = 100;

    for (let i = 0; i < valid.length; i += chunkSize) {
      const chunk = valid.slice(i, i + chunkSize);
      let blockStr = `${chunk.length} beginbfchar\n`;
      for (const item of chunk) {
        const gidHex = item.glyphId.toString(16).padStart(4, '0').toUpperCase();
        const uniHex = stringToHexUtf16BE(item.unicodeString).toUpperCase();
        blockStr += `<${gidHex}> <${uniHex}>\n`;
      }
      blockStr += 'endbfchar\n';
      blocks.push(blockStr);
    }

    const cMapContent = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo <<
  /Registry (Adobe)
  /Ordering (UCS)
  /Supplement 0
>> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
  <0000> <FFFF>
endcodespacerange
${blocks.join('\n')}
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;

    return cMapContent;
  }

  /**
   * Builds CIDFont Type 2 font dictionary metadata.
   */
  buildCidFontDetails(
    fontFamily: string,
    tagPrefix: string,
    mappings: CidMapping[],
    glyphAdvancesDesignUnits?: Map<number, number>
  ): CidFontDetails {
    const cleanFamily = fontFamily.replace(/\s+/g, '');
    const baseFont = `${tagPrefix}+${cleanFamily}`;
    const toUnicodeStream = this.generateToUnicodeCMap(mappings);

    const widths: Array<{ cid: number; width: number }> = [];
    if (glyphAdvancesDesignUnits) {
      for (const [gid, w] of glyphAdvancesDesignUnits.entries()) {
        widths.push({ cid: gid, width: Math.round(w) });
      }
    } else {
      // Default standard advances
      for (const m of mappings) {
        widths.push({ cid: m.glyphId, width: 600 });
      }
    }

    return {
      baseFont,
      cidSystemInfo: {
        registry: 'Adobe',
        ordering: 'Identity',
        supplement: 0
      },
      toUnicodeStream,
      widths
    };
  }

  /**
   * Generates a PDF font dictionary snippet for embedding.
   */
  generatePdfFontObjectSnippet(details: CidFontDetails): string {
    // Widths array format: [ c1 [ w1 w2 ... ] ] or [ c1 c2 w ]
    const widthsList = details.widths
      .sort((a, b) => a.cid - b.cid)
      .map((w) => `${w.cid} [ ${w.width} ]`)
      .join(' ');

    return `<<
  /Type /Font
  /Subtype /Type0
  /BaseFont /${details.baseFont}
  /Encoding /Identity-H
  /DescendantFonts [
    <<
      /Type /Font
      /Subtype /CIDFontType2
      /BaseFont /${details.baseFont}
      /CIDSystemInfo <<
        /Registry (${details.cidSystemInfo.registry})
        /Ordering (${details.cidSystemInfo.ordering})
        /Supplement ${details.cidSystemInfo.supplement}
      >>
      /CIDToGIDMap /Identity
      /W [ ${widthsList} ]
    >>
  ]
>>`;
  }
}
