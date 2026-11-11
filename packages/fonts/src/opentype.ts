/**
 * @rhypdf/fonts - OpenType/TrueType Binary Parser
 * Parses font tables: OS/2 (fsType embedding permissions, weights), name (family, postscript),
 * cmap (glyph coverage), and fvar (variable font axes).
 */

export interface FsTypePermissions {
  raw: number;
  isRestricted: boolean; // 0x0002 - Cannot be embedded
  isPreviewPrintOnly: boolean; // 0x0004 - Cannot be edited
  isEditable: boolean; // 0x0008 - Editable embedding permitted
  isInstallable: boolean; // 0x0000 - Installable embedding permitted
  noSubsetting: boolean; // 0x0100 - Subsetting not permitted
  bitmapOnly: boolean; // 0x0200 - Bitmap embedding only
  embeddableForEditing: boolean; // Can be safely embedded in an editable PDF
}

export interface FontNameRecords {
  fontFamily: string;
  fontSubfamily: string;
  fullName: string;
  postScriptName: string;
}

export interface VariableAxis {
  tag: string;
  minValue: number;
  defaultValue: number;
  maxValue: number;
  name: string;
}

export interface VariableInstance {
  name: string;
  coordinates: Record<string, number>;
}

export interface VariableFontInfo {
  isVariable: boolean;
  axes: VariableAxis[];
  instances: VariableInstance[];
}

export interface ParsedFontInfo {
  names: FontNameRecords;
  weightClass: number; // 100-900
  isItalic: boolean;
  isBold: boolean;
  fsType: FsTypePermissions;
  hasCmap: boolean;
  supportedCodePoints: Set<number>;
  variableInfo: VariableFontInfo;
  tableTags: string[];
}

export function parseFsType(fsTypeVal: number): FsTypePermissions {
  // If bit 1 (0x0002) is set, restricted license embedding
  const isRestricted = (fsTypeVal & 0x0002) !== 0;
  // If bit 2 (0x0004) is set, preview & print only
  const isPreviewPrintOnly = (fsTypeVal & 0x0004) !== 0;
  // If bit 3 (0x0008) is set, editable embedding
  const isEditable = (fsTypeVal & 0x0008) !== 0;
  // If bits 0-3 are 0 (0x0000), installable
  const isInstallable = (fsTypeVal & 0x000e) === 0;
  // Bit 8 (0x0100): No subsetting
  const noSubsetting = (fsTypeVal & 0x0100) !== 0;
  // Bit 9 (0x0200): Bitmap only
  const bitmapOnly = (fsTypeVal & 0x0200) !== 0;

  // Can be embedded for PDF text editing:
  // Must NOT be restricted (0x0002), and must be either Installable (0x0000) or Editable (0x0008)
  const embeddableForEditing = !isRestricted && !isPreviewPrintOnly && (isInstallable || isEditable);

  return {
    raw: fsTypeVal,
    isRestricted,
    isPreviewPrintOnly,
    isEditable,
    isInstallable,
    noSubsetting,
    bitmapOnly,
    embeddableForEditing
  };
}

/**
 * Parse an OpenType / TrueType font binary buffer
 */
export function parseFontBuffer(buffer: ArrayBuffer | Uint8Array): ParsedFontInfo {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.byteLength < 12) {
    throw new Error('Invalid font buffer: file too short');
  }

  // sfnt header
  const sfntVersion = view.getUint32(0, false);
  const isTrueType =
    sfntVersion === 0x00010000 ||
    sfntVersion === 0x74727565 || // 'true'
    sfntVersion === 0x74797031; // 'typ1'
  const isOpenTypeCFF = sfntVersion === 0x4f54544f; // 'OTTO'
  const isWoff = sfntVersion === 0x774f4646; // 'wOFF'
  const isWoff2 = sfntVersion === 0x774f4632; // 'wOF2'

  if (!isTrueType && !isOpenTypeCFF && !isWoff && !isWoff2) {
    throw new Error(`Unsupported font signature: 0x${sfntVersion.toString(16)}`);
  }

  // Handle standard sfnt table directory
  const numTables = view.getUint16(4, false);
  const tables = new Map<string, { offset: number; length: number }>();
  let offset = 12;

  for (let i = 0; i < numTables; i++) {
    if (offset + 16 > bytes.byteLength) break;
    const tag = String.fromCharCode(
      bytes[offset]!,
      bytes[offset + 1]!,
      bytes[offset + 2]!,
      bytes[offset + 3]!
    );
    const tableOffset = view.getUint32(offset + 8, false);
    const tableLength = view.getUint32(offset + 12, false);
    tables.set(tag, { offset: tableOffset, length: tableLength });
    offset += 16;
  }

  // 1. Parse 'OS/2' table
  let weightClass = 400;
  let isItalic = false;
  let isBold = false;
  let fsTypeVal = 0; // Default installable

  const os2Table = tables.get('OS/2');
  if (os2Table && os2Table.offset + 10 <= bytes.byteLength) {
    const os2Offset = os2Table.offset;
    weightClass = view.getUint16(os2Offset + 4, false) || 400;
    fsTypeVal = view.getUint16(os2Offset + 8, false);

    // fsSelection at offset 62
    if (os2Offset + 64 <= bytes.byteLength) {
      const fsSelection = view.getUint16(os2Offset + 62, false);
      isItalic = (fsSelection & 0x0001) !== 0 || (fsSelection & 0x0200) !== 0; // italic or oblique
      isBold = (fsSelection & 0x0020) !== 0;
    }
  }

  const fsType = parseFsType(fsTypeVal);

  // 2. Parse 'name' table
  const names: FontNameRecords = {
    fontFamily: 'Unknown',
    fontSubfamily: 'Regular',
    fullName: 'Unknown Regular',
    postScriptName: 'Unknown-Regular'
  };

  const nameTable = tables.get('name');
  if (nameTable && nameTable.offset + 6 <= bytes.byteLength) {
    parseNameTable(bytes, view, nameTable.offset, names);
  }

  // 3. Parse 'cmap' table for character coverage
  const supportedCodePoints = new Set<number>();
  const cmapTable = tables.get('cmap');
  if (cmapTable && cmapTable.offset + 4 <= bytes.byteLength) {
    parseCmapTable(bytes, view, cmapTable.offset, supportedCodePoints);
  }

  // 4. Parse 'fvar' table for variable font axes
  const variableInfo: VariableFontInfo = {
    isVariable: false,
    axes: [],
    instances: []
  };

  const fvarTable = tables.get('fvar');
  if (fvarTable && fvarTable.offset + 16 <= bytes.byteLength) {
    parseFvarTable(bytes, view, fvarTable.offset, variableInfo);
  }

  return {
    names,
    weightClass,
    isItalic,
    isBold,
    fsType,
    hasCmap: supportedCodePoints.size > 0,
    supportedCodePoints,
    variableInfo,
    tableTags: Array.from(tables.keys())
  };
}

function parseNameTable(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  names: FontNameRecords
) {
  const count = view.getUint16(offset + 2, false);
  const stringOffset = offset + view.getUint16(offset + 4, false);

  let familyFallback = '';
  let subFamilyFallback = '';
  let fullFallback = '';
  let psFallback = '';

  for (let i = 0; i < count; i++) {
    const recordOffset = offset + 6 + i * 12;
    if (recordOffset + 12 > bytes.byteLength) break;

    const platformID = view.getUint16(recordOffset, false);
    const encodingID = view.getUint16(recordOffset + 2, false);
    const nameID = view.getUint16(recordOffset + 6, false);
    const length = view.getUint16(recordOffset + 8, false);
    const strOffset = stringOffset + view.getUint16(recordOffset + 10, false);

    if (strOffset + length > bytes.byteLength) continue;

    // Decode string: platformID 3 (Windows) or platformID 0 (Unicode) use UTF-16BE; platformID 1 (Macintosh) uses MacRoman / ASCII
    let decoded = '';
    if (platformID === 3 || platformID === 0) {
      const u16 = [];
      for (let j = 0; j < length; j += 2) {
        if (strOffset + j + 1 < bytes.byteLength) {
          u16.push(view.getUint16(strOffset + j, false));
        }
      }
      decoded = String.fromCharCode(...u16);
    } else {
      const chars = [];
      for (let j = 0; j < length; j++) {
        chars.push(String.fromCharCode(bytes[strOffset + j]!));
      }
      decoded = chars.join('');
    }

    decoded = decoded.trim();
    if (!decoded) continue;

    const isPreferred = platformID === 3 && (encodingID === 1 || encodingID === 10);

    if (nameID === 1) {
      if (isPreferred || !familyFallback) familyFallback = decoded;
    } else if (nameID === 2) {
      if (isPreferred || !subFamilyFallback) subFamilyFallback = decoded;
    } else if (nameID === 4) {
      if (isPreferred || !fullFallback) fullFallback = decoded;
    } else if (nameID === 6) {
      if (isPreferred || !psFallback) psFallback = decoded;
    } else if (nameID === 16) {
      // Typographic Family Name (preferred over ID 1)
      familyFallback = decoded;
    } else if (nameID === 17) {
      // Typographic Subfamily Name
      subFamilyFallback = decoded;
    }
  }

  if (familyFallback) names.fontFamily = familyFallback;
  if (subFamilyFallback) names.fontSubfamily = subFamilyFallback;
  if (fullFallback) names.fullName = fullFallback;
  if (psFallback) names.postScriptName = psFallback;
}

function parseCmapTable(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  supported: Set<number>
) {
  const numSubtables = view.getUint16(offset + 2, false);

  for (let i = 0; i < numSubtables; i++) {
    const subtableRecord = offset + 4 + i * 8;
    if (subtableRecord + 8 > bytes.byteLength) break;

    const subtableOffset = offset + view.getUint32(subtableRecord + 4, false);
    if (subtableOffset + 6 > bytes.byteLength) continue;

    const format = view.getUint16(subtableOffset, false);

    // Format 4: Segment mapping to delta values (standard BMP unicode)
    if (format === 4) {
      parseCmapFormat4(bytes, view, subtableOffset, supported);
    }
    // Format 12: Segmented coverage (Full Unicode including supplementary planes)
    else if (format === 12 && subtableOffset + 16 <= bytes.byteLength) {
      parseCmapFormat12(view, subtableOffset, supported);
    }
  }
}

function parseCmapFormat4(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  supported: Set<number>
) {
  const segCountX2 = view.getUint16(offset + 6, false);
  const segCount = segCountX2 / 2;

  const endCodeOffset = offset + 14;
  const startCodeOffset = endCodeOffset + segCountX2 + 2;

  for (let s = 0; s < segCount; s++) {
    if (startCodeOffset + s * 2 + 2 > bytes.byteLength) break;
    const startCode = view.getUint16(startCodeOffset + s * 2, false);
    const endCode = view.getUint16(endCodeOffset + s * 2, false);

    if (startCode === 0xffff && endCode === 0xffff) break;

    for (let c = startCode; c <= endCode; c++) {
      supported.add(c);
      if (supported.size > 10000) break; // Limit check to prevent memory runaway
    }
  }
}

function parseCmapFormat12(
  view: DataView,
  offset: number,
  supported: Set<number>
) {
  const numGroups = view.getUint32(offset + 12, false);
  let groupOffset = offset + 16;

  for (let g = 0; g < numGroups; g++) {
    const startCharCode = view.getUint32(groupOffset, false);
    const endCharCode = view.getUint32(groupOffset + 4, false);
    for (let c = startCharCode; c <= endCharCode; c++) {
      supported.add(c);
      if (supported.size > 20000) break;
    }
    groupOffset += 12;
  }
}

function parseFvarTable(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  variableInfo: VariableFontInfo
) {
  const axesArrayOffset = offset + view.getUint16(offset + 4, false);
  const axisCount = view.getUint16(offset + 8, false);
  const axisSize = view.getUint16(offset + 10, false);

  if (axisCount > 0) {
    variableInfo.isVariable = true;
  }

  for (let a = 0; a < axisCount; a++) {
    const axOffset = axesArrayOffset + a * axisSize;
    if (axOffset + 20 > bytes.byteLength) break;

    const tag = String.fromCharCode(
      bytes[axOffset]!,
      bytes[axOffset + 1]!,
      bytes[axOffset + 2]!,
      bytes[axOffset + 3]!
    );
    // 16.16 fixed point numbers
    const minValue = view.getInt32(axOffset + 4, false) / 65536;
    const defaultValue = view.getInt32(axOffset + 8, false) / 65536;
    const maxValue = view.getInt32(axOffset + 12, false) / 65536;

    variableInfo.axes.push({
      tag,
      minValue,
      defaultValue,
      maxValue,
      name: tag
    });
  }
}
