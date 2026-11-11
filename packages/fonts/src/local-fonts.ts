/**
 * @rhypdf/fonts - Local Font Access API & Font Importer
 * Queries local system fonts with permission checks, and validates user imported
 * TTF/OTF font files with OS/2.fsType embedding permission rules. Tasks 8.5, 8.6.
 */

import { parseFontBuffer, type ParsedFontInfo } from './opentype';
import { FontCatalog, type FontCatalogEntry, type FontWeight, type FontStyle } from './catalog';

export interface LocalFontQueryOptions {
  checkEmbeddingPermissions?: boolean;
}

export interface ImportedFontResult {
  entry: FontCatalogEntry;
  parsed: ParsedFontInfo;
  fontData: Uint8Array;
}

/**
 * Task 8.5: Query local system fonts using the Local Font Access API (Chromium)
 */
export async function queryLocalSystemFonts(
  options: LocalFontQueryOptions = {}
): Promise<{ fonts: FontCatalogEntry[]; permissionGranted: boolean }> {
  const globalObj = typeof window !== 'undefined' ? (window as any) : null;

  if (!globalObj || typeof globalObj.queryLocalFonts !== 'function') {
    return { fonts: [], permissionGranted: false };
  }

  try {
    const rawFonts = await globalObj.queryLocalFonts();
    const familyMap = new Map<string, FontCatalogEntry>();

    for (const font of rawFonts) {
      const family = font.family || font.fullName;
      if (!family || familyMap.has(family.toLowerCase())) continue;

      let embeddable = true;

      // If requested and font.blob() is available, inspect OS/2.fsType table
      if (options.checkEmbeddingPermissions && typeof font.blob === 'function') {
        try {
          const blob: Blob = await font.blob();
          const buffer = await blob.arrayBuffer();
          const parsed = parseFontBuffer(buffer);
          embeddable = parsed.fsType.embeddableForEditing;
        } catch {
          // If inspection fails, retain default embeddable flag
        }
      }

      const style = (font.style || 'regular').toLowerCase();
      const isItalic = style.includes('italic') || style.includes('oblique');
      const isBold = style.includes('bold');

      const entry: FontCatalogEntry = {
        id: `local-${family.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        family,
        displayName: family,
        category: 'sans-serif', // Fallback category
        weights: [isBold ? 700 : 400],
        styles: [isItalic ? 'italic' : 'normal'],
        supportedScripts: ['latin'],
        source: 'local',
        license: 'Custom',
        embeddable
      };

      familyMap.set(family.toLowerCase(), entry);
      FontCatalog.getInstance().register(entry);
    }

    return {
      fonts: Array.from(familyMap.values()),
      permissionGranted: true
    };
  } catch {
    // Permission denied or aborted
    return { fonts: [], permissionGranted: false };
  }
}

/**
 * Task 8.6: Import font (TTF / OTF / WOFF2) from the user's device.
 * Validates OS/2.fsType embedding permissions.
 * Throws if fsType restricts embedding (0x0002).
 */
export async function importFontFromDevice(
  file: File | Blob | ArrayBuffer | Uint8Array,
  customFamilyName?: string
): Promise<ImportedFontResult> {
  let fontBytes: Uint8Array;

  if (file instanceof ArrayBuffer) {
    fontBytes = new Uint8Array(file);
  } else if (file instanceof Uint8Array) {
    fontBytes = file;
  } else {
    const buf = await file.arrayBuffer();
    fontBytes = new Uint8Array(buf);
  }

  // Parse font tables and OS/2.fsType
  const parsed = parseFontBuffer(fontBytes);

  // Enforce Task 8.6 embedding permission check:
  // fsType bit 1 (0x0002) is Restricted License embedding
  if (parsed.fsType.isRestricted) {
    throw new Error(
      `Cannot import font "${parsed.names.fontFamily}": License restriction (fsType 0x0002 Restricted License embedding). This font is protected and cannot be embedded in PDF documents.`
    );
  }

  // Determine weight and style
  const weight = (parsed.weightClass || 400) as FontWeight;
  const style: FontStyle = parsed.isItalic ? 'italic' : 'normal';
  const family = customFamilyName || parsed.names.fontFamily || 'Custom Font';

  const entry: FontCatalogEntry = {
    id: `user-${family.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    family,
    displayName: `${family} (User Font)`,
    category: parsed.names.fontFamily.toLowerCase().includes('serif')
      ? 'serif'
      : parsed.names.fontFamily.toLowerCase().includes('mono')
        ? 'monospace'
        : 'sans-serif',
    weights: [weight],
    styles: [style],
    supportedScripts: ['latin'],
    source: 'user',
    license: 'Custom',
    embeddable: parsed.fsType.embeddableForEditing,
    isVariable: parsed.variableInfo.isVariable
  };

  // Register in FontCatalog
  FontCatalog.getInstance().register(entry);

  // Also register in browser FontFace API if in browser environment so the user can see it in editor
  if (typeof window !== 'undefined' && typeof FontFace !== 'undefined' && 'fonts' in document) {
    try {
      const face = new FontFace(family, fontBytes.buffer);
      await face.load();
      document.fonts.add(face);
    } catch {
      // Non-fatal if browser FontFace fails (e.g. happy-dom)
    }
  }

  return {
    entry,
    parsed,
    fontData: fontBytes
  };
}
