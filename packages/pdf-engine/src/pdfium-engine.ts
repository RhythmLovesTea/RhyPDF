/**
 * @rhypdf/pdf-engine - PdfiumEngine
 * Real PDFium WebAssembly-backed implementation of PdfEngine.
 * Handles in-memory & chunked document loading, password-protected PDFs,
 * page info, rendering to ImageBitmap, text extraction, mutation, and saving.
 * Strictly zero PDFium types leak outside this file.
 */

import type { WrappedPdfiumModule } from '@embedpdf/pdfium';
import type {
  PageInfo,
  PageObject,
  TextRun,
  CharBox,
  Rect,
  Matrix2D,
  ColorRGBA,
  TextRenderMode
} from '@rhypdf/pdf-model';
import type {
  PdfEngine,
  DocumentHandle,
  RenderOptions,
  PageMutation,
  MutationResult,
  SaveOptions
} from './index';
import { PdfError } from './index';
import { loadPdfiumWasm, type WasmLoaderOptions } from './wasm-loader';

interface EmscriptenRuntimeModule {
  HEAPU8: Uint8Array;
  wasmExports: {
    malloc: (size: number) => number;
    free: (ptr: number) => void;
  };
  addFunction: (fn: (...args: number[]) => number, sig: string) => number;
  removeFunction: (ptr: number) => void;
}

interface ActiveDocument {
  handle: DocumentHandle;
  docPtr: number;
  memPtr?: number;
  accessPtr?: number;
  fnPtr?: number;
  isChunked: boolean;
  fileLen: number;
  isEncrypted: boolean;
  openPages: Map<number, number>;
}

export class PdfiumEngine implements PdfEngine {
  private pdfium: WrappedPdfiumModule;
  private documents = new Map<DocumentHandle, ActiveDocument>();
  private handleCounter = 0;

  constructor(pdfiumModule: WrappedPdfiumModule) {
    this.pdfium = pdfiumModule;
    if (typeof this.pdfium.PDFiumExt_Init === 'function') {
      this.pdfium.PDFiumExt_Init();
    }
  }

  private get emscripten(): EmscriptenRuntimeModule {
    return this.pdfium.pdfium as unknown as EmscriptenRuntimeModule;
  }

  /**
   * Factory to create and initialize PdfiumEngine from WASM binary or URL.
   */
  static async create(
    options?: WasmLoaderOptions & { wasmBinary?: ArrayBuffer }
  ): Promise<PdfiumEngine> {
    if (options?.wasmBinary) {
      const { init } = await import('@embedpdf/pdfium');
      const module = await init({ wasmBinary: options.wasmBinary });
      return new PdfiumEngine(module);
    }
    const module = await loadPdfiumWasm(options);
    return new PdfiumEngine(module);
  }

  /**
   * Open document from ArrayBuffer or Blob.
   * Big files (> 25MB) and Blobs automatically use chunked file access (FPDF_LoadCustomDocument).
   */
  async open(data: ArrayBuffer | Blob, opts?: { password?: string }): Promise<DocumentHandle> {
    const isBlob =
      typeof Blob !== 'undefined' &&
      (data instanceof Blob ||
        (typeof data === 'object' && data !== null && 'size' in data && 'slice' in data));
    const totalLen = isBlob ? (data as Blob).size : (data as ArrayBuffer).byteLength;

    if (totalLen === 0) {
      throw new PdfError('Corrupt', 'Document buffer is empty');
    }

    const CHUNK_THRESHOLD = 25 * 1024 * 1024; // 25 MB
    const useChunked = isBlob || totalLen > CHUNK_THRESHOLD;

    let docPtr: number;
    let memPtr = 0;
    let accessPtr = 0;
    let fnPtr = 0;

    const password = opts?.password ?? '';

    if (useChunked) {
      let reader: (position: number, size: number) => Uint8Array;

      if (isBlob) {
        const blob = data as Blob;
        const globalScope = globalThis as unknown as {
          FileReaderSync?: new () => { readAsArrayBuffer: (b: Blob) => ArrayBuffer };
        };
        if (typeof (blob as unknown as { readChunkSync?: unknown }).readChunkSync === 'function') {
          reader = (pos: number, sz: number) =>
            (
              blob as unknown as { readChunkSync: (p: number, s: number) => Uint8Array }
            ).readChunkSync(pos, sz);
        } else if (typeof globalScope.FileReaderSync !== 'undefined') {
          const syncReader = new globalScope.FileReaderSync();
          reader = (pos: number, sz: number) => {
            const slice = blob.slice(pos, pos + sz);
            return new Uint8Array(syncReader.readAsArrayBuffer(slice));
          };
        } else {
          const buf = await blob.arrayBuffer();
          const u8 = new Uint8Array(buf);
          reader = (pos: number, sz: number) => u8.subarray(pos, pos + sz);
        }
      } else {
        const u8 = new Uint8Array(data as ArrayBuffer);
        reader = (pos: number, sz: number) => u8.subarray(pos, pos + sz);
      }

      const getBlock = (_param: number, position: number, pBuf: number, size: number): number => {
        try {
          const chunk = reader(position, size);
          this.emscripten.HEAPU8.set(chunk, pBuf);
          return 1;
        } catch {
          return 0;
        }
      };

      fnPtr = this.emscripten.addFunction(getBlock, 'iiiii');
      accessPtr = this.emscripten.wasmExports.malloc(12);

      const dv = new DataView(this.emscripten.HEAPU8.buffer);
      dv.setUint32(accessPtr + 0, totalLen, true);
      dv.setUint32(accessPtr + 4, fnPtr, true);
      dv.setUint32(accessPtr + 8, 0, true);

      docPtr = this.pdfium.FPDF_LoadCustomDocument(accessPtr, password);
    } else {
      const u8 = new Uint8Array(data as ArrayBuffer);
      memPtr = this.emscripten.wasmExports.malloc(u8.length);
      this.emscripten.HEAPU8.set(u8, memPtr);
      docPtr = this.pdfium.FPDF_LoadMemDocument(memPtr, u8.length, password);
    }

    if (!docPtr) {
      if (accessPtr) this.emscripten.wasmExports.free(accessPtr);
      if (fnPtr) this.emscripten.removeFunction(fnPtr);
      if (memPtr) this.emscripten.wasmExports.free(memPtr);

      const lastError = this.pdfium.FPDF_GetLastError();
      switch (lastError) {
        case 4: // FPDF_ERR_PASSWORD
          if (opts?.password !== undefined && opts.password !== '') {
            throw new PdfError('WrongPassword', 'Incorrect password for protected PDF');
          } else {
            throw new PdfError(
              'PasswordRequired',
              'Password is required to open this protected PDF'
            );
          }
        case 3: // FPDF_ERR_FORMAT
          throw new PdfError('Corrupt', 'Document format is invalid or corrupt');
        case 2: // FPDF_ERR_FILE
          throw new PdfError('IO', 'Unable to read PDF document data');
        case 5: // FPDF_ERR_SECURITY
          throw new PdfError('Unsupported', 'Unsupported encryption or security handler');
        default:
          throw new PdfError('Corrupt', `Failed to open PDF document (error code: ${lastError})`);
      }
    }

    const isEncrypted =
      typeof this.pdfium.EPDF_IsEncrypted === 'function'
        ? Boolean(this.pdfium.EPDF_IsEncrypted(docPtr))
        : false;

    this.handleCounter++;
    const handle: DocumentHandle = `pdf-doc-${this.handleCounter}`;

    this.documents.set(handle, {
      handle,
      docPtr,
      memPtr: memPtr || undefined,
      accessPtr: accessPtr || undefined,
      fnPtr: fnPtr || undefined,
      isChunked: useChunked,
      fileLen: totalLen,
      isEncrypted,
      openPages: new Map()
    });

    return handle;
  }

  async close(docHandle: DocumentHandle): Promise<void> {
    const doc = this.documents.get(docHandle);
    if (!doc) {
      throw new PdfError(
        'IO',
        `Cannot close document: handle '${docHandle}' not found or already closed`
      );
    }

    // Close any open page handles
    for (const pagePtr of doc.openPages.values()) {
      this.pdfium.FPDF_ClosePage(pagePtr);
    }
    doc.openPages.clear();

    // Close document handle
    this.pdfium.FPDF_CloseDocument(doc.docPtr);

    // Free allocated memory and callbacks
    if (doc.accessPtr) {
      this.emscripten.wasmExports.free(doc.accessPtr);
    }
    if (doc.fnPtr) {
      this.emscripten.removeFunction(doc.fnPtr);
    }
    if (doc.memPtr) {
      this.emscripten.wasmExports.free(doc.memPtr);
    }

    this.documents.delete(docHandle);
  }

  async pageCount(docHandle: DocumentHandle): Promise<number> {
    const doc = this.getDocument(docHandle);
    return this.pdfium.FPDF_GetPageCount(doc.docPtr);
  }

  async pageInfo(docHandle: DocumentHandle, pageIndex: number): Promise<PageInfo> {
    const doc = this.getDocument(docHandle);
    const count = this.pdfium.FPDF_GetPageCount(doc.docPtr);

    if (pageIndex < 0 || pageIndex >= count) {
      throw new PdfError(
        'Unsupported',
        `Page index ${pageIndex} is out of bounds (document has ${count} pages)`
      );
    }

    const pagePtr = this.loadPage(doc, pageIndex);
    const width = this.pdfium.FPDF_GetPageWidthF(pagePtr);
    const height = this.pdfium.FPDF_GetPageHeightF(pagePtr);
    const rawRot = this.pdfium.FPDFPage_GetRotation(pagePtr);
    const rotation = (rawRot === 1 ? 90 : rawRot === 2 ? 180 : rawRot === 3 ? 270 : 0) as
      0 | 90 | 180 | 270;

    return {
      pageIndex,
      width,
      height,
      rotation,
      mediaBox: { left: 0, bottom: 0, right: width, top: height },
      cropBox: { left: 0, bottom: 0, right: width, top: height }
    };
  }

  async renderPage(
    docHandle: DocumentHandle,
    pageIndex: number,
    opts: RenderOptions,
    signal?: AbortSignal
  ): Promise<ImageBitmap> {
    if (signal?.aborted) {
      throw new PdfError('Cancelled', 'Render request aborted before execution');
    }

    const doc = this.getDocument(docHandle);
    const info = await this.pageInfo(docHandle, pageIndex);
    const pagePtr = this.loadPage(doc, pageIndex);

    const scale = opts.scale * opts.dpr;
    const effectiveRot =
      opts.rotationOverride !== undefined ? opts.rotationOverride : info.rotation;
    const isSwapped = effectiveRot === 90 || effectiveRot === 270;

    let destWidthPx: number;
    let destHeightPx: number;
    let startX: number;
    let startY: number;
    let sizeX: number;
    let sizeY: number;

    if (opts.clipRect) {
      const tileWidthPt = Math.max(1, opts.clipRect.right - opts.clipRect.left);
      const tileHeightPt = Math.max(1, opts.clipRect.top - opts.clipRect.bottom);
      destWidthPx = Math.max(1, Math.round(tileWidthPt * scale));
      destHeightPx = Math.max(1, Math.round(tileHeightPt * scale));
      startX = -Math.round(opts.clipRect.left * scale);
      startY = -Math.round((info.height - opts.clipRect.top) * scale);
      sizeX = Math.round(info.width * scale);
      sizeY = Math.round(info.height * scale);
    } else {
      const pageWidthPt = isSwapped ? info.height : info.width;
      const pageHeightPt = isSwapped ? info.width : info.height;
      destWidthPx = Math.max(1, Math.round(pageWidthPt * scale));
      destHeightPx = Math.max(1, Math.round(pageHeightPt * scale));
      startX = 0;
      startY = 0;
      sizeX = destWidthPx;
      sizeY = destHeightPx;
    }

    const bitmap = this.pdfium.FPDFBitmap_CreateEx(destWidthPx, destHeightPx, 4, 0, 0);
    if (!bitmap) {
      throw new PdfError(
        'OutOfMemory',
        `Failed to allocate render bitmap ${destWidthPx}x${destHeightPx}`
      );
    }

    try {
      if (signal?.aborted) {
        throw new PdfError('Cancelled', 'Render request aborted during execution');
      }

      // Background white (0xFFFFFFFF)
      this.pdfium.FPDFBitmap_FillRect(bitmap, 0, 0, destWidthPx, destHeightPx, 0xffffffff);

      const rotCode =
        effectiveRot === 90 ? 1 : effectiveRot === 180 ? 2 : effectiveRot === 270 ? 3 : 0;

      const flags = opts.renderAnnotations !== false ? 1 : 0;
      this.pdfium.FPDF_RenderPageBitmap(
        bitmap,
        pagePtr,
        startX,
        startY,
        sizeX,
        sizeY,
        rotCode,
        flags
      );

      if (signal?.aborted) {
        throw new PdfError('Cancelled', 'Render request aborted after rendering');
      }

      const bufferPtr = this.pdfium.FPDFBitmap_GetBuffer(bitmap);
      const stride = this.pdfium.FPDFBitmap_GetStride(bitmap);
      const bgraBytes = new Uint8Array(
        this.emscripten.HEAPU8.buffer,
        bufferPtr,
        stride * destHeightPx
      );

      // Convert BGRA to RGBA
      const rgba = new Uint8ClampedArray(destWidthPx * destHeightPx * 4);
      for (let y = 0; y < destHeightPx; y++) {
        const rowSrc = y * stride;
        const rowDst = y * destWidthPx * 4;
        for (let x = 0; x < destWidthPx; x++) {
          const srcIdx = rowSrc + x * 4;
          const dstIdx = rowDst + x * 4;
          rgba[dstIdx + 0] = bgraBytes[srcIdx + 2] ?? 0; // R
          rgba[dstIdx + 1] = bgraBytes[srcIdx + 1] ?? 0; // G
          rgba[dstIdx + 2] = bgraBytes[srcIdx + 0] ?? 0; // B
          rgba[dstIdx + 3] = bgraBytes[srcIdx + 3] ?? 255; // A
        }
      }

      // In browser / worker with native createImageBitmap
      const globalScope = globalThis as unknown as {
        createImageBitmap?: (data: ImageData) => Promise<ImageBitmap>;
        ImageData?: new (data: Uint8ClampedArray, sw: number, sh: number) => ImageData;
      };

      if (
        typeof globalScope.createImageBitmap === 'function' &&
        typeof globalScope.ImageData === 'function'
      ) {
        const imageData = new globalScope.ImageData(rgba, destWidthPx, destHeightPx);
        return await globalScope.createImageBitmap(imageData);
      }

      // Fallback for Node / Vitest test environment with pixel buffer inspection
      return {
        width: destWidthPx,
        height: destHeightPx,
        data: rgba,
        close: () => {}
      } as unknown as ImageBitmap;
    } finally {
      this.pdfium.FPDFBitmap_Destroy(bitmap);
    }
  }

  async getPageObjects(docHandle: DocumentHandle, pageIndex: number): Promise<PageObject[]> {
    const doc = this.getDocument(docHandle);
    const pagePtr = this.loadPage(doc, pageIndex);
    const textPagePtr = this.pdfium.FPDFText_LoadPage(pagePtr);
    const count = this.pdfium.FPDFPage_CountObjects(pagePtr);
    const objects: PageObject[] = [];

    const boundsPtr = this.emscripten.wasmExports.malloc(16); // 4 floats: left, bottom, right, top
    const matPtr = this.emscripten.wasmExports.malloc(24); // 6 floats: a, b, c, d, e, f

    try {
      for (let i = 0; i < count; i++) {
        const objPtr = this.pdfium.FPDFPage_GetObject(pagePtr, i);
        if (!objPtr) continue;

        const obj = await this.extractObjectFromPtr(
          doc,
          pagePtr,
          textPagePtr,
          objPtr,
          i,
          pageIndex,
          boundsPtr,
          matPtr
        );
        if (obj) {
          objects.push(obj);
        }
      }
    } finally {
      if (textPagePtr) {
        this.pdfium.FPDFText_ClosePage(textPagePtr);
      }
      this.emscripten.wasmExports.free(boundsPtr);
      this.emscripten.wasmExports.free(matPtr);
    }

    return objects;
  }

  private async extractObjectFromPtr(
    doc: ActiveDocument,
    pagePtr: number,
    textPagePtr: number,
    objPtr: number,
    zIndex: number,
    pageIndex: number,
    boundsPtr: number,
    matPtr: number,
    parentChain?: string[],
    parentMatrix?: Matrix2D
  ): Promise<PageObject | null> {
    const type = this.pdfium.FPDFPageObj_GetType(objPtr);

    this.pdfium.FPDFPageObj_GetBounds(
      objPtr,
      boundsPtr,
      boundsPtr + 4,
      boundsPtr + 8,
      boundsPtr + 12
    );

    const dvB = new DataView(this.emscripten.HEAPU8.buffer, boundsPtr, 16);
    const bounds: Rect = {
      left: dvB.getFloat32(0, true),
      bottom: dvB.getFloat32(4, true),
      right: dvB.getFloat32(8, true),
      top: dvB.getFloat32(12, true)
    };

    let matrix: Matrix2D = [1, 0, 0, 1, bounds.left, bounds.bottom];
    const hasMat = this.pdfium.FPDFPageObj_GetMatrix(objPtr, matPtr);
    if (hasMat) {
      const dvM = new DataView(this.emscripten.HEAPU8.buffer, matPtr, 24);
      matrix = [
        dvM.getFloat32(0, true),
        dvM.getFloat32(4, true),
        dvM.getFloat32(8, true),
        dvM.getFloat32(12, true),
        dvM.getFloat32(16, true),
        dvM.getFloat32(20, true)
      ];
    }

    if (parentMatrix) {
      matrix = [
        parentMatrix[0] * matrix[0] + parentMatrix[2] * matrix[1],
        parentMatrix[1] * matrix[0] + parentMatrix[3] * matrix[1],
        parentMatrix[0] * matrix[2] + parentMatrix[2] * matrix[3],
        parentMatrix[1] * matrix[2] + parentMatrix[3] * matrix[3],
        parentMatrix[0] * matrix[4] + parentMatrix[2] * matrix[5] + parentMatrix[4],
        parentMatrix[1] * matrix[4] + parentMatrix[3] * matrix[5] + parentMatrix[5]
      ];
    }

    const idPrefix = parentChain && parentChain.length > 0 ? `${parentChain.join('-')}-` : '';
    const id = `${idPrefix}obj-${pageIndex}-${zIndex}`;

    if (type === 1) {
      // Text object
      let fontName = 'Helvetica';
      let fontSize = 12;
      let text = '';
      let flags = 0;
      let weight = 400;
      let isEmbedded = false;
      let isSubset = false;
      let subsetTag: string | undefined;

      const font = this.pdfium.FPDFTextObj_GetFont(objPtr);
      if (font) {
        const fnBuf = this.emscripten.wasmExports.malloc(128);
        const fnLen = this.pdfium.FPDFFont_GetBaseFontName(font, fnBuf, 128);
        if (fnLen > 0) {
          const raw = new TextDecoder().decode(
            new Uint8Array(this.emscripten.HEAPU8.buffer, fnBuf, fnLen)
          );
          fontName = raw.replace(/\0.*$/, '').trim() || 'Helvetica';
        }
        this.emscripten.wasmExports.free(fnBuf);

        flags = this.pdfium.FPDFFont_GetFlags(font);
        weight = this.pdfium.FPDFFont_GetWeight(font) || 400;
        const emb = this.pdfium.FPDFFont_GetIsEmbedded(font);
        isEmbedded = emb === 1;

        const subsetMatch = fontName.match(/^([A-Z]{6})\+(.+)$/);
        if (subsetMatch && subsetMatch[1] && subsetMatch[2]) {
          isSubset = true;
          subsetTag = subsetMatch[1];
          fontName = subsetMatch[2];
        }
      }

      const fsPtr = this.emscripten.wasmExports.malloc(4);
      if (this.pdfium.FPDFTextObj_GetFontSize(objPtr, fsPtr)) {
        fontSize = new DataView(this.emscripten.HEAPU8.buffer).getFloat32(fsPtr, true);
      }
      this.emscripten.wasmExports.free(fsPtr);

      // Render mode
      const rawMode = this.pdfium.FPDFTextObj_GetTextRenderMode(objPtr);
      const renderModes: TextRenderMode[] = [
        'fill',
        'stroke',
        'fillThenStroke',
        'invisible',
        'fillClip',
        'strokeClip',
        'fillStrokeClip',
        'clip'
      ];
      const renderMode: TextRenderMode = renderModes[rawMode] ?? 'fill';

      // Colors
      const colorPtr = this.emscripten.wasmExports.malloc(16);
      let fillColor: ColorRGBA = { r: 0, g: 0, b: 0, a: 255 };
      if (
        this.pdfium.FPDFPageObj_GetFillColor(
          objPtr,
          colorPtr,
          colorPtr + 4,
          colorPtr + 8,
          colorPtr + 12
        )
      ) {
        const dvC = new DataView(this.emscripten.HEAPU8.buffer, colorPtr, 16);
        fillColor = {
          r: dvC.getUint32(0, true),
          g: dvC.getUint32(4, true),
          b: dvC.getUint32(8, true),
          a: dvC.getUint32(12, true)
        };
      }

      let strokeColor: ColorRGBA | undefined;
      if (
        this.pdfium.FPDFPageObj_GetStrokeColor(
          objPtr,
          colorPtr,
          colorPtr + 4,
          colorPtr + 8,
          colorPtr + 12
        )
      ) {
        const dvS = new DataView(this.emscripten.HEAPU8.buffer, colorPtr, 16);
        strokeColor = {
          r: dvS.getUint32(0, true),
          g: dvS.getUint32(4, true),
          b: dvS.getUint32(8, true),
          a: dvS.getUint32(12, true)
        };
      }
      this.emscripten.wasmExports.free(colorPtr);

      // Text string
      if (textPagePtr) {
        const textBuf = this.emscripten.wasmExports.malloc(512);
        const textLen = this.pdfium.FPDFTextObj_GetText(objPtr, textPagePtr, textBuf, 512);
        if (textLen > 1) {
          const u16 = new Uint16Array(this.emscripten.HEAPU8.buffer, textBuf, textLen - 1);
          text = String.fromCharCode(...u16);
        }
        this.emscripten.wasmExports.free(textBuf);
      }

      const rotation = Math.round((Math.atan2(matrix[1], matrix[0]) * 180) / Math.PI);
      const horizontalScale = Math.hypot(matrix[0], matrix[1]);

      return {
        id,
        type: 'text',
        bounds,
        matrix,
        zIndex,
        parentFormChain: parentChain,
        text,
        fontName,
        fontSize,
        fillColor,
        strokeColor,
        renderMode,
        rotation,
        horizontalScale,
        isEmbeddedSubset: isSubset,
        fontInfo: {
          isEmbedded,
          isSubset,
          subsetTag,
          flags,
          weight,
          isItalic: (flags & 64) !== 0,
          isBold: weight >= 700 || (flags & (1 << 18)) !== 0
        }
      };
    } else if (type === 3) {
      // Image object
      let pixelWidth = Math.max(1, Math.round(Math.abs(bounds.right - bounds.left)));
      let pixelHeight = Math.max(1, Math.round(Math.abs(bounds.top - bounds.bottom)));
      let bitsPerPixel = 24;
      let colorSpace: 'DeviceGray' | 'DeviceRGB' | 'DeviceCMYK' | 'DeviceLab' | 'Unknown' =
        'DeviceRGB';
      const filters: string[] = [];
      let hasMask = false;
      let hasSoftMask = false;
      let previewBitmap: ImageBitmap | undefined;

      // 1. Pixel dimensions from FPDFImageObj_GetImagePixelSize
      if (typeof this.pdfium.FPDFImageObj_GetImagePixelSize === 'function') {
        const sizePtr = this.emscripten.wasmExports.malloc(8);
        if (this.pdfium.FPDFImageObj_GetImagePixelSize(objPtr, sizePtr, sizePtr + 4)) {
          const dvS = new DataView(this.emscripten.HEAPU8.buffer, sizePtr, 8);
          const pw = dvS.getUint32(0, true);
          const ph = dvS.getUint32(4, true);
          if (pw > 0 && ph > 0) {
            pixelWidth = pw;
            pixelHeight = ph;
          }
        }
        this.emscripten.wasmExports.free(sizePtr);
      }

      // 2. Metadata via FPDFImageObj_GetImageMetadata
      if (typeof this.pdfium.FPDFImageObj_GetImageMetadata === 'function') {
        const metaPtr = this.emscripten.wasmExports.malloc(28);
        if (this.pdfium.FPDFImageObj_GetImageMetadata(objPtr, pagePtr, metaPtr)) {
          const dvM = new DataView(this.emscripten.HEAPU8.buffer, metaPtr, 28);
          const metaW = dvM.getUint32(0, true);
          const metaH = dvM.getUint32(4, true);
          if (metaW > 0 && metaH > 0) {
            pixelWidth = metaW;
            pixelHeight = metaH;
          }
          const bpp = dvM.getUint32(16, true);
          if (bpp > 0) {
            bitsPerPixel = bpp;
          }
          const cs = dvM.getInt32(20, true);
          switch (cs) {
            case 1:
              colorSpace = 'DeviceGray';
              break;
            case 2:
              colorSpace = 'DeviceRGB';
              break;
            case 3:
              colorSpace = 'DeviceCMYK';
              break;
            case 6:
              colorSpace = 'DeviceLab';
              break;
            default:
              colorSpace = 'Unknown';
              break;
          }
        }
        this.emscripten.wasmExports.free(metaPtr);
      }

      // 3. Filters via FPDFImageObj_GetImageFilterCount / FPDFImageObj_GetImageFilter
      if (
        typeof this.pdfium.FPDFImageObj_GetImageFilterCount === 'function' &&
        typeof this.pdfium.FPDFImageObj_GetImageFilter === 'function'
      ) {
        const filterCount = this.pdfium.FPDFImageObj_GetImageFilterCount(objPtr);
        if (filterCount > 0) {
          const filterBuf = this.emscripten.wasmExports.malloc(64);
          for (let f = 0; f < filterCount; f++) {
            const filterLen = this.pdfium.FPDFImageObj_GetImageFilter(objPtr, f, filterBuf, 64);
            if (filterLen > 0) {
              const rawFilter = new TextDecoder().decode(
                new Uint8Array(this.emscripten.HEAPU8.buffer, filterBuf, filterLen)
              );
              const filterName = rawFilter.replace(/\0.*$/, '').trim();
              if (filterName) {
                filters.push(filterName);
              }
            }
          }
          this.emscripten.wasmExports.free(filterBuf);
        }
      }

      // 4. Calculate effective DPI
      const scaleX = Math.hypot(matrix[0], matrix[1]) || Math.abs(bounds.right - bounds.left) || 72;
      const scaleY = Math.hypot(matrix[2], matrix[3]) || Math.abs(bounds.top - bounds.bottom) || 72;
      const effectiveDpi = {
        x: Math.round((pixelWidth / (scaleX / 72)) * 10) / 10,
        y: Math.round((pixelHeight / (scaleY / 72)) * 10) / 10
      };

      // 5. Bitmap preview and mask / soft-mask info
      let bitmapPtr = 0;
      if (typeof this.pdfium.FPDFImageObj_GetBitmap === 'function') {
        bitmapPtr = this.pdfium.FPDFImageObj_GetBitmap(objPtr);
      }
      if (!bitmapPtr && typeof this.pdfium.FPDFImageObj_GetRenderedBitmap === 'function') {
        bitmapPtr = this.pdfium.FPDFImageObj_GetRenderedBitmap(doc.docPtr, pagePtr, objPtr);
      }

      if (bitmapPtr) {
        try {
          const bmpW = this.pdfium.FPDFBitmap_GetWidth(bitmapPtr);
          const bmpH = this.pdfium.FPDFBitmap_GetHeight(bitmapPtr);
          const bmpFormat = this.pdfium.FPDFBitmap_GetFormat(bitmapPtr);
          const bmpStride = this.pdfium.FPDFBitmap_GetStride(bitmapPtr);
          const bmpBufPtr = this.pdfium.FPDFBitmap_GetBuffer(bitmapPtr);

          if (bmpW > 0 && bmpH > 0 && bmpBufPtr) {
            const srcU8 = new Uint8Array(
              this.emscripten.HEAPU8.buffer,
              bmpBufPtr,
              bmpStride * bmpH
            );
            const rgba = new Uint8ClampedArray(bmpW * bmpH * 4);

            if (bmpFormat === 4) {
              let hasSemiTransparent = false;
              let hasFullyTransparent = false;

              for (let y = 0; y < bmpH; y++) {
                const srcRow = y * bmpStride;
                const dstRow = y * bmpW * 4;
                for (let x = 0; x < bmpW; x++) {
                  const b = srcU8[srcRow + x * 4]!;
                  const g = srcU8[srcRow + x * 4 + 1]!;
                  const r = srcU8[srcRow + x * 4 + 2]!;
                  const a = srcU8[srcRow + x * 4 + 3]!;

                  rgba[dstRow + x * 4] = r;
                  rgba[dstRow + x * 4 + 1] = g;
                  rgba[dstRow + x * 4 + 2] = b;
                  rgba[dstRow + x * 4 + 3] = a;

                  if (a < 255) {
                    if (a === 0) {
                      hasFullyTransparent = true;
                    } else {
                      hasSemiTransparent = true;
                    }
                  }
                }
              }

              if (hasSemiTransparent) {
                hasSoftMask = true;
              }
              if (hasFullyTransparent) {
                hasMask = true;
              }
            } else if (bmpFormat === 1) {
              for (let y = 0; y < bmpH; y++) {
                const srcRow = y * bmpStride;
                const dstRow = y * bmpW * 4;
                for (let x = 0; x < bmpW; x++) {
                  const g = srcU8[srcRow + x]!;
                  rgba[dstRow + x * 4] = g;
                  rgba[dstRow + x * 4 + 1] = g;
                  rgba[dstRow + x * 4 + 2] = g;
                  rgba[dstRow + x * 4 + 3] = 255;
                }
              }
            } else {
              for (let y = 0; y < bmpH; y++) {
                const srcRow = y * bmpStride;
                const dstRow = y * bmpW * 4;
                for (let x = 0; x < bmpW; x++) {
                  const srcIdx = srcRow + x * (bmpFormat === 3 ? 4 : 3);
                  rgba[dstRow + x * 4] = srcU8[srcIdx + 2]!;
                  rgba[dstRow + x * 4 + 1] = srcU8[srcIdx + 1]!;
                  rgba[dstRow + x * 4 + 2] = srcU8[srcIdx]!;
                  rgba[dstRow + x * 4 + 3] = 255;
                }
              }
            }

            const globalScope = globalThis as unknown as {
              createImageBitmap?: (data: ImageData) => Promise<ImageBitmap>;
              ImageData?: new (data: Uint8ClampedArray, sw: number, sh: number) => ImageData;
            };

            if (
              typeof globalScope.createImageBitmap === 'function' &&
              typeof globalScope.ImageData === 'function'
            ) {
              const imageData = new globalScope.ImageData(rgba, bmpW, bmpH);
              previewBitmap = await globalScope.createImageBitmap(imageData);
            } else {
              previewBitmap = {
                width: bmpW,
                height: bmpH,
                data: rgba,
                close: () => {}
              } as unknown as ImageBitmap;
            }
          }
        } finally {
          this.pdfium.FPDFBitmap_Destroy(bitmapPtr);
        }
      }

      return {
        id,
        type: 'image',
        bounds,
        matrix,
        zIndex,
        parentFormChain: parentChain,
        pixelWidth,
        pixelHeight,
        effectiveDpi,
        filters,
        colorSpace,
        bitsPerPixel,
        hasMask,
        hasSoftMask,
        previewBitmap
      };
    } else if (type === 2 || type === 4) {
      // Path object
      return {
        id,
        type: 'path',
        bounds,
        matrix,
        zIndex,
        parentFormChain: parentChain,
        segments: [],
        lineWidth: 1
      };
    } else if (type === 6) {
      // Form XObject
      const subObjects: PageObject[] = [];
      const formChain = parentChain ? [...parentChain, id] : [id];
      if (typeof this.pdfium.FPDFFormObj_CountObjects === 'function') {
        const subCount = this.pdfium.FPDFFormObj_CountObjects(objPtr);
        for (let s = 0; s < subCount; s++) {
          const subObjPtr = this.pdfium.FPDFFormObj_GetObject(objPtr, s);
          if (subObjPtr) {
            const sub = await this.extractObjectFromPtr(
              doc,
              pagePtr,
              textPagePtr,
              subObjPtr,
              s,
              pageIndex,
              boundsPtr,
              matPtr,
              formChain,
              matrix
            );
            if (sub) subObjects.push(sub);
          }
        }
      }
      return {
        id,
        type: 'form',
        bounds,
        matrix,
        zIndex,
        parentFormChain: parentChain,
        subObjects
      };
    }

    return null;
  }

  async extractText(docHandle: DocumentHandle, pageIndex: number): Promise<TextRun[]> {
    const doc = this.getDocument(docHandle);
    const pagePtr = this.loadPage(doc, pageIndex);
    const textPage = this.pdfium.FPDFText_LoadPage(pagePtr);
    if (!textPage) return [];

    try {
      const charCount = this.pdfium.FPDFText_CountChars(textPage);
      if (charCount <= 0) return [];

      const textBufPtr = this.emscripten.wasmExports.malloc((charCount + 1) * 2);
      this.pdfium.FPDFText_GetText(textPage, 0, charCount, textBufPtr);

      const u16 = new Uint16Array(this.emscripten.HEAPU8.buffer, textBufPtr, charCount);
      const text = String.fromCharCode(...u16);
      this.emscripten.wasmExports.free(textBufPtr);

      const rectPtr = this.emscripten.wasmExports.malloc(16);
      const dv = new DataView(this.emscripten.HEAPU8.buffer, rectPtr, 16);
      const charBoxes: CharBox[] = [];

      for (let c = 0; c < Math.min(charCount, 500); c++) {
        this.pdfium.FPDFText_GetCharBox(
          textPage,
          c,
          rectPtr,
          rectPtr + 4,
          rectPtr + 8,
          rectPtr + 12
        );
        charBoxes.push({
          char: text[c] || '',
          box: {
            left: dv.getFloat32(0, true),
            bottom: dv.getFloat32(8, true),
            right: dv.getFloat32(4, true),
            top: dv.getFloat32(12, true)
          }
        });
      }
      this.emscripten.wasmExports.free(rectPtr);

      const fontSize = this.pdfium.FPDFText_GetFontSize(textPage, 0) || 12;

      return [
        {
          id: `run-${pageIndex}-0`,
          type: 'text',
          bounds: {
            left: charBoxes[0]?.box.left || 0,
            bottom: charBoxes[0]?.box.bottom || 0,
            right: charBoxes[charBoxes.length - 1]?.box.right || 100,
            top: charBoxes[0]?.box.top || 100
          },
          matrix: [1, 0, 0, 1, 0, 0],
          zIndex: 0,
          text,
          fontName: 'Helvetica',
          fontSize,
          fillColor: { r: 0, g: 0, b: 0, a: 255 },
          isEmbeddedSubset: false,
          charBoxes
        }
      ];
    } finally {
      this.pdfium.FPDFText_ClosePage(textPage);
    }
  }

  async mutate(
    docHandle: DocumentHandle,
    pageIndex: number,
    ops: PageMutation[]
  ): Promise<MutationResult> {
    const doc = this.getDocument(docHandle);
    const pagePtr = this.loadPage(doc, pageIndex);

    for (const op of ops) {
      if (op.type === 'removeObject') {
        const count = this.pdfium.FPDFPage_CountObjects(pagePtr);
        if (count > 0) {
          const obj = this.pdfium.FPDFPage_GetObject(pagePtr, 0);
          if (obj) {
            this.pdfium.FPDFPage_RemoveObject(pagePtr, obj);
          }
        }
      }
    }

    this.pdfium.FPDFPage_GenerateContent(pagePtr);
    const remainingCount = this.pdfium.FPDFPage_CountObjects(pagePtr);

    return {
      success: true,
      affectedPage: pageIndex,
      remainingObjectsCount: remainingCount
    };
  }

  async save(docHandle: DocumentHandle, opts?: SaveOptions): Promise<Blob> {
    const doc = this.getDocument(docHandle);

    if (opts?.stripSecurity && typeof this.pdfium.EPDF_RemoveEncryption === 'function') {
      this.pdfium.EPDF_RemoveEncryption(doc.docPtr);
    }

    const writer = this.pdfium.PDFiumExt_OpenFileWriter();
    if (!writer) {
      throw new PdfError('IO', 'Failed to initialize PDF file writer');
    }

    try {
      this.pdfium.PDFiumExt_SaveAsCopy(doc.docPtr, writer);
      const size = this.pdfium.PDFiumExt_GetFileWriterSize(writer);
      const outPtr = this.emscripten.wasmExports.malloc(size);

      this.pdfium.PDFiumExt_GetFileWriterData(writer, outPtr, size);
      const savedBytes = new Uint8Array(this.emscripten.HEAPU8.buffer, outPtr, size).slice();
      this.emscripten.wasmExports.free(outPtr);

      return new Blob([savedBytes], { type: 'application/pdf' });
    } finally {
      this.pdfium.PDFiumExt_CloseFileWriter(writer);
    }
  }

  private getDocument(handle: DocumentHandle): ActiveDocument {
    const doc = this.documents.get(handle);
    if (!doc) {
      throw new PdfError('IO', `Document '${handle}' is not open or has already been closed`);
    }
    return doc;
  }

  private loadPage(doc: ActiveDocument, pageIndex: number): number {
    let pagePtr = doc.openPages.get(pageIndex);
    if (!pagePtr) {
      pagePtr = this.pdfium.FPDF_LoadPage(doc.docPtr, pageIndex);
      if (!pagePtr) {
        throw new PdfError('Corrupt', `Failed to load page ${pageIndex}`);
      }
      doc.openPages.set(pageIndex, pagePtr);
    }
    return pagePtr;
  }
}
