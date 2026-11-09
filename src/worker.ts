import { init, WrappedPdfiumModule } from '@embedpdf/pdfium';

let pdfiumModule: WrappedPdfiumModule | null = null;

function getHeap(m: WrappedPdfiumModule): Uint8Array {
  return (m.pdfium as any).HEAPU8 as Uint8Array;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, id, payload } = e.data;

  try {
    if (type === 'INIT') {
      const wasmUrl = payload?.wasmUrl || '/pdfium.wasm';
      const response = await fetch(wasmUrl);
      const wasmBinary = await response.arrayBuffer();
      pdfiumModule = await init({ wasmBinary });
      if (pdfiumModule.PDFiumExt_Init) {
        pdfiumModule.PDFiumExt_Init();
      }
      self.postMessage({
        id,
        type: 'INIT_SUCCESS',
        result: { status: 'initialized', hasExtInit: typeof pdfiumModule.PDFiumExt_Init === 'function' }
      });
      return;
    }

    if (type === 'RENDER_PAGE') {
      if (!pdfiumModule) throw new Error('PDFium not initialized');
      const { pdfBytes, pageIndex, scale } = payload;
      
      const heap = getHeap(pdfiumModule);
      const pData = pdfiumModule.pdfium.wasmExports.malloc(pdfBytes.byteLength);
      const heapBytes = new Uint8Array(heap.buffer, pData, pdfBytes.byteLength);
      heapBytes.set(new Uint8Array(pdfBytes));

      const doc = pdfiumModule.FPDF_LoadMemDocument(pData, pdfBytes.byteLength, '');
      if (!doc) {
        pdfiumModule.pdfium.wasmExports.free(pData);
        throw new Error('Failed to load document');
      }

      const page = pdfiumModule.FPDF_LoadPage(doc, pageIndex);
      const width = Math.floor(pdfiumModule.FPDF_GetPageWidthF(page) * scale);
      const height = Math.floor(pdfiumModule.FPDF_GetPageHeightF(page) * scale);

      // FPDFBitmap_CreateEx(width, height, format, first_scan, stride)
      // Format 4 = FPDFBitmap_BGRA
      const bitmap = pdfiumModule.FPDFBitmap_CreateEx(width, height, 4, 0, 0);
      // Fill with white background (0xFFFFFFFF)
      pdfiumModule.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xFFFFFFFF);

      // Render page to bitmap: FPDF_RenderPageBitmap(bitmap, page, start_x, start_y, size_x, size_y, rotate, flags)
      pdfiumModule.FPDF_RenderPageBitmap(bitmap, page, 0, 0, width, height, 0, 0);

      const bufferPtr = pdfiumModule.FPDFBitmap_GetBuffer(bitmap);
      const pixelBytes = new Uint8Array(heap.buffer, bufferPtr, width * height * 4);
      
      // Convert BGRA to RGBA for standard browser ImageData
      const rgba = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < width * height * 4; i += 4) {
        rgba[i] = pixelBytes[i + 2];     // R
        rgba[i + 1] = pixelBytes[i + 1]; // G
        rgba[i + 2] = pixelBytes[i];     // B
        rgba[i + 3] = pixelBytes[i + 3]; // A
      }

      pdfiumModule.FPDFBitmap_Destroy(bitmap);
      pdfiumModule.FPDF_ClosePage(page);
      pdfiumModule.FPDF_CloseDocument(doc);
      pdfiumModule.pdfium.wasmExports.free(pData);

      self.postMessage(
        { id, type: 'RENDER_PAGE_SUCCESS', result: { width, height, rgbaBuffer: rgba.buffer } },
        [rgba.buffer]
      );
      return;
    }

    if (type === 'GET_PAGE_OBJECTS') {
      if (!pdfiumModule) throw new Error('PDFium not initialized');
      const { pdfBytes, pageIndex, scale = 1.0 } = payload;
      const heap = getHeap(pdfiumModule);
      const pData = pdfiumModule.pdfium.wasmExports.malloc(pdfBytes.byteLength);
      new Uint8Array(heap.buffer, pData, pdfBytes.byteLength).set(new Uint8Array(pdfBytes));

      const doc = pdfiumModule.FPDF_LoadMemDocument(pData, pdfBytes.byteLength, '');
      const page = pdfiumModule.FPDF_LoadPage(doc, pageIndex);
      const pageWidth = pdfiumModule.FPDF_GetPageWidthF(page);
      const pageHeight = pdfiumModule.FPDF_GetPageHeightF(page);
      const rotationIndex = pdfiumModule.FPDFPage_GetRotation(page);
      const rotation = rotationIndex * 90; // 0=0, 1=90, 2=180, 3=270
      const count = pdfiumModule.FPDFPage_CountObjects(page);
      const objects = [];

      const devW = Math.floor(pageWidth * scale);
      const devH = Math.floor(pageHeight * scale);

      const pLeft = pdfiumModule.pdfium.wasmExports.malloc(4);
      const pBottom = pdfiumModule.pdfium.wasmExports.malloc(4);
      const pRight = pdfiumModule.pdfium.wasmExports.malloc(4);
      const pTop = pdfiumModule.pdfium.wasmExports.malloc(4);

      const pDevX1 = pdfiumModule.pdfium.wasmExports.malloc(4);
      const pDevY1 = pdfiumModule.pdfium.wasmExports.malloc(4);
      const pDevX2 = pdfiumModule.pdfium.wasmExports.malloc(4);
      const pDevY2 = pdfiumModule.pdfium.wasmExports.malloc(4);

      const view = new DataView(heap.buffer);

      for (let i = 0; i < count; i++) {
        const obj = pdfiumModule.FPDFPage_GetObject(page, i);
        const objType = pdfiumModule.FPDFPageObj_GetType(obj);
        const typeName = objType === 1 ? 'TEXT' : objType === 2 ? 'PATH' : objType === 3 ? 'IMAGE' : objType === 5 ? 'FORM' : 'OTHER';

        pdfiumModule.FPDFPageObj_GetBounds(obj, pLeft, pBottom, pRight, pTop);
        const left = view.getFloat32(pLeft, true);
        const bottom = view.getFloat32(pBottom, true);
        const right = view.getFloat32(pRight, true);
        const top = view.getFloat32(pTop, true);

        // Convert (left, top) and (right, bottom) to device coordinates via FPDF_PageToDevice
        pdfiumModule.FPDF_PageToDevice(page, 0, 0, devW, devH, 0, left, top, pDevX1, pDevY1);
        pdfiumModule.FPDF_PageToDevice(page, 0, 0, devW, devH, 0, right, bottom, pDevX2, pDevY2);

        const x1 = view.getInt32(pDevX1, true);
        const y1 = view.getInt32(pDevY1, true);
        const x2 = view.getInt32(pDevX2, true);
        const y2 = view.getInt32(pDevY2, true);

        const devBox = {
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          w: Math.abs(x2 - x1),
          h: Math.abs(y2 - y1),
        };

        objects.push({
          index: i,
          type: typeName,
          pdfBounds: { left, bottom, right, top },
          devBox
        });
      }

      pdfiumModule.pdfium.wasmExports.free(pLeft);
      pdfiumModule.pdfium.wasmExports.free(pBottom);
      pdfiumModule.pdfium.wasmExports.free(pRight);
      pdfiumModule.pdfium.wasmExports.free(pTop);
      pdfiumModule.pdfium.wasmExports.free(pDevX1);
      pdfiumModule.pdfium.wasmExports.free(pDevY1);
      pdfiumModule.pdfium.wasmExports.free(pDevX2);
      pdfiumModule.pdfium.wasmExports.free(pDevY2);

      pdfiumModule.FPDF_ClosePage(page);
      pdfiumModule.FPDF_CloseDocument(doc);
      pdfiumModule.pdfium.wasmExports.free(pData);

      self.postMessage({
        id,
        type: 'PAGE_OBJECTS_SUCCESS',
        result: { count, rotation, pageWidth, pageHeight, devW, devH, objects }
      });
      return;
    }

    if (type === 'EXTRACT_TEXT_RUNS') {
      if (!pdfiumModule) throw new Error('PDFium not initialized');
      const { pdfBytes, pageIndex } = payload;
      const heap = getHeap(pdfiumModule);
      const pData = pdfiumModule.pdfium.wasmExports.malloc(pdfBytes.byteLength);
      new Uint8Array(heap.buffer, pData, pdfBytes.byteLength).set(new Uint8Array(pdfBytes));

      const doc = pdfiumModule.FPDF_LoadMemDocument(pData, pdfBytes.byteLength, '');
      const page = pdfiumModule.FPDF_LoadPage(doc, pageIndex);
      const textPage = pdfiumModule.FPDFText_LoadPage(page);
      const charCount = pdfiumModule.FPDFText_CountChars(textPage);

      const pLeft = pdfiumModule.pdfium.wasmExports.malloc(8);
      const pRight = pdfiumModule.pdfium.wasmExports.malloc(8);
      const pBottom = pdfiumModule.pdfium.wasmExports.malloc(8);
      const pTop = pdfiumModule.pdfium.wasmExports.malloc(8);

      const pR = pdfiumModule.pdfium.wasmExports.malloc(4);
      const pG = pdfiumModule.pdfium.wasmExports.malloc(4);
      const pB = pdfiumModule.pdfium.wasmExports.malloc(4);
      const pA = pdfiumModule.pdfium.wasmExports.malloc(4);

      const pFlags = pdfiumModule.pdfium.wasmExports.malloc(4);
      const fontBufLen = 256;
      const pFontBuf = pdfiumModule.pdfium.wasmExports.malloc(fontBufLen);

      const pMatrix = pdfiumModule.pdfium.wasmExports.malloc(24); // 6 doubles = 48 or floats = 24

      const view = new DataView(heap.buffer);

      interface CharInfo {
        char: string;
        unicode: number;
        fontSize: number;
        fontName: string;
        isSubset: boolean;
        color: { r: number; g: number; b: number; a: number };
        box: { left: number; right: number; bottom: number; top: number };
      }

      const chars: CharInfo[] = [];

      for (let i = 0; i < charCount; i++) {
        const u = pdfiumModule.FPDFText_GetUnicode(textPage, i);
        if (u === 0) continue;
        const ch = String.fromCodePoint(u);
        const fontSize = pdfiumModule.FPDFText_GetFontSize(textPage, i);

        // Char Box (doubles in FPDFText_GetCharBox)
        pdfiumModule.FPDFText_GetCharBox(textPage, i, pLeft, pRight, pBottom, pTop);
        const left = view.getFloat64(pLeft, true);
        const right = view.getFloat64(pRight, true);
        const bottom = view.getFloat64(pBottom, true);
        const top = view.getFloat64(pTop, true);

        // Fill Color
        pdfiumModule.FPDFText_GetFillColor(textPage, i, pR, pG, pB, pA);
        const r = view.getUint32(pR, true);
        const g = view.getUint32(pG, true);
        const b = view.getUint32(pB, true);
        const a = view.getUint32(pA, true);

        // Font info
        const written = pdfiumModule.FPDFText_GetFontInfo(textPage, i, pFontBuf, fontBufLen, pFlags);
        let fontName = 'Unknown';
        if (written > 0) {
          const raw = new Uint8Array(heap.buffer, pFontBuf, written);
          fontName = new TextDecoder().decode(raw).replace(/\0.*$/, '');
        }
        const isSubset = /^[A-Z]{6}\+/.test(fontName);

        chars.push({
          char: ch,
          unicode: u,
          fontSize,
          fontName,
          isSubset,
          color: { r, g, b, a },
          box: { left, right, bottom, top }
        });
      }

      // Group into runs sharing fontName, fontSize, color
      const runs: Array<{
        text: string;
        fontName: string;
        fontSize: number;
        isSubset: boolean;
        color: { r: number; g: number; b: number; a: number };
        bounds: { left: number; bottom: number; right: number; top: number };
        charBoxes: Array<{ char: string; left: number; right: number; bottom: number; top: number }>;
      }> = [];

      let currentRun: (typeof runs)[0] | null = null;
      for (const c of chars) {
        const sameStyle = currentRun &&
          currentRun.fontName === c.fontName &&
          Math.abs(currentRun.fontSize - c.fontSize) < 0.1 &&
          currentRun.color.r === c.color.r &&
          currentRun.color.g === c.color.g &&
          currentRun.color.b === c.color.b;

        if (sameStyle && currentRun) {
          currentRun.text += c.char;
          currentRun.bounds.left = Math.min(currentRun.bounds.left, c.box.left);
          currentRun.bounds.bottom = Math.min(currentRun.bounds.bottom, c.box.bottom);
          currentRun.bounds.right = Math.max(currentRun.bounds.right, c.box.right);
          currentRun.bounds.top = Math.max(currentRun.bounds.top, c.box.top);
          currentRun.charBoxes.push({ char: c.char, ...c.box });
        } else {
          currentRun = {
            text: c.char,
            fontName: c.fontName,
            fontSize: c.fontSize,
            isSubset: c.isSubset,
            color: c.color,
            bounds: { left: c.box.left, bottom: c.box.bottom, right: c.box.right, top: c.box.top },
            charBoxes: [{ char: c.char, ...c.box }]
          };
          runs.push(currentRun);
        }
      }

      pdfiumModule.pdfium.wasmExports.free(pLeft);
      pdfiumModule.pdfium.wasmExports.free(pRight);
      pdfiumModule.pdfium.wasmExports.free(pBottom);
      pdfiumModule.pdfium.wasmExports.free(pTop);
      pdfiumModule.pdfium.wasmExports.free(pR);
      pdfiumModule.pdfium.wasmExports.free(pG);
      pdfiumModule.pdfium.wasmExports.free(pB);
      pdfiumModule.pdfium.wasmExports.free(pA);
      pdfiumModule.pdfium.wasmExports.free(pFlags);
      pdfiumModule.pdfium.wasmExports.free(pFontBuf);
      pdfiumModule.pdfium.wasmExports.free(pMatrix);

      pdfiumModule.FPDFText_ClosePage(textPage);
      pdfiumModule.FPDF_ClosePage(page);
      pdfiumModule.FPDF_CloseDocument(doc);
      pdfiumModule.pdfium.wasmExports.free(pData);

      self.postMessage({
        id,
        type: 'EXTRACT_TEXT_RUNS_SUCCESS',
        result: { charCount: chars.length, runCount: runs.length, runs }
      });
      return;
    }

    if (type === 'MUTATE_AND_SAVE_TEXT') {
      if (!pdfiumModule) throw new Error('PDFium not initialized');
      const { pdfBytes, removeIndex = 0, newText, x = 50, y = 790, fontSize = 20.0 } = payload;
      const heap = getHeap(pdfiumModule);
      const pData = pdfiumModule.pdfium.wasmExports.malloc(pdfBytes.byteLength);
      new Uint8Array(heap.buffer, pData, pdfBytes.byteLength).set(new Uint8Array(pdfBytes));

      const doc = pdfiumModule.FPDF_LoadMemDocument(pData, pdfBytes.byteLength, '');
      const page = pdfiumModule.FPDF_LoadPage(doc, 0);

      // Remove target object
      const targetObj = pdfiumModule.FPDFPage_GetObject(page, removeIndex);
      const removeOk = pdfiumModule.FPDFPage_RemoveObject(page, targetObj);

      // Load font & create new text object
      const font = pdfiumModule.FPDFText_LoadStandardFont(doc, 'Helvetica-Bold');
      const newTextObj = pdfiumModule.FPDFPageObj_CreateTextObj(doc, font, fontSize);

      // Set UTF-16LE text
      const bufLen = (newText.length + 1) * 2;
      const utf16Ptr = pdfiumModule.pdfium.wasmExports.malloc(bufLen);
      for (let i = 0; i < newText.length; i++) {
        const code = newText.charCodeAt(i);
        heap[utf16Ptr + i * 2] = code & 0xff;
        heap[utf16Ptr + i * 2 + 1] = (code >> 8) & 0xff;
      }
      heap[utf16Ptr + newText.length * 2] = 0;
      heap[utf16Ptr + newText.length * 2 + 1] = 0;

      pdfiumModule.FPDFText_SetText(newTextObj, utf16Ptr);
      pdfiumModule.pdfium.wasmExports.free(utf16Ptr);

      // Set FS_MATRIX (a=1, b=0, c=0, d=1, e=x, f=y)
      const pMatrix = pdfiumModule.pdfium.wasmExports.malloc(24);
      const view = new DataView(heap.buffer);
      view.setFloat32(pMatrix, 1, true);
      view.setFloat32(pMatrix + 4, 0, true);
      view.setFloat32(pMatrix + 8, 0, true);
      view.setFloat32(pMatrix + 12, 1, true);
      view.setFloat32(pMatrix + 16, x, true);
      view.setFloat32(pMatrix + 20, y, true);
      pdfiumModule.FPDFPageObj_SetMatrix(newTextObj, pMatrix);
      pdfiumModule.pdfium.wasmExports.free(pMatrix);

      pdfiumModule.FPDFPage_InsertObject(page, newTextObj);
      pdfiumModule.FPDFPage_GenerateContent(page);

      // Save as copy
      const writer = pdfiumModule.PDFiumExt_OpenFileWriter();
      pdfiumModule.PDFiumExt_SaveAsCopy(doc, writer);
      const savedSize = pdfiumModule.PDFiumExt_GetFileWriterSize(writer);

      const pOutBuf = pdfiumModule.pdfium.wasmExports.malloc(savedSize);
      pdfiumModule.PDFiumExt_GetFileWriterData(writer, pOutBuf, savedSize);
      const savedBytes = new Uint8Array(heap.buffer, pOutBuf, savedSize).slice();

      pdfiumModule.pdfium.wasmExports.free(pOutBuf);
      pdfiumModule.PDFiumExt_CloseFileWriter(writer);
      pdfiumModule.FPDF_ClosePage(page);
      pdfiumModule.FPDF_CloseDocument(doc);
      pdfiumModule.pdfium.wasmExports.free(pData);

      // Verify the saved PDF immediately
      const pCheck = pdfiumModule.pdfium.wasmExports.malloc(savedBytes.byteLength);
      new Uint8Array(heap.buffer, pCheck, savedBytes.byteLength).set(savedBytes);
      const doc2 = pdfiumModule.FPDF_LoadMemDocument(pCheck, savedBytes.byteLength, '');
      const page2 = pdfiumModule.FPDF_LoadPage(doc2, 0);
      const textPage2 = pdfiumModule.FPDFText_LoadPage(page2);
      const len2 = pdfiumModule.FPDFText_CountChars(textPage2);

      const pBuf = pdfiumModule.pdfium.wasmExports.malloc((len2 + 1) * 2);
      pdfiumModule.FPDFText_GetText(textPage2, 0, len2, pBuf);

      let extracted = '';
      for (let i = 0; i < len2; i++) {
        const code = heap[pBuf + i * 2] | (heap[pBuf + i * 2 + 1] << 8);
        if (code > 0) extracted += String.fromCharCode(code);
      }
      pdfiumModule.pdfium.wasmExports.free(pBuf);
      pdfiumModule.FPDFText_ClosePage(textPage2);
      pdfiumModule.FPDF_ClosePage(page2);
      pdfiumModule.FPDF_CloseDocument(doc2);
      pdfiumModule.pdfium.wasmExports.free(pCheck);

      const hasGhost = extracted.includes('Sample Contract Agreement');
      const hasNew = extracted.includes(newText);

      self.postMessage({
        id,
        type: 'MUTATE_AND_SAVE_TEXT_SUCCESS',
        result: {
          savedSize,
          hasGhost,
          hasNew,
          extractedPreview: extracted.slice(0, 120),
          savedBytes: savedBytes.buffer
        }
      }, [savedBytes.buffer]);
      return;
    }

    if (type === 'MUTATE_AND_SAVE_IMAGES') {
      if (!pdfiumModule) throw new Error('PDFium not initialized');
      const { pdfBytes } = payload;
      const heap = getHeap(pdfiumModule);
      const pData = pdfiumModule.pdfium.wasmExports.malloc(pdfBytes.byteLength);
      new Uint8Array(heap.buffer, pData, pdfBytes.byteLength).set(new Uint8Array(pdfBytes));

      const doc = pdfiumModule.FPDF_LoadMemDocument(pData, pdfBytes.byteLength, '');
      const page = pdfiumModule.FPDF_LoadPage(doc, 0);

      const count = pdfiumModule.FPDFPage_CountObjects(page);
      const imageObjects = [];
      for (let i = 0; i < count; i++) {
        const obj = pdfiumModule.FPDFPage_GetObject(page, i);
        if (pdfiumModule.FPDFPageObj_GetType(obj) === 3) {
          imageObjects.push(obj);
        }
      }

      // 1. Transform Image 0: rotate 45 deg, scale 120x120, move to (80, 80)
      if (imageObjects.length > 0) {
        const rad = 45 * Math.PI / 180;
        const s = 120;
        const a = Math.cos(rad) * s;
        const b = Math.sin(rad) * s;
        const c = -Math.sin(rad) * s;
        const d = Math.cos(rad) * s;
        pdfiumModule.FPDFImageObj_SetMatrix(imageObjects[0], a, b, c, d, 80, 80);
      }

      // 2. Delete Image 1
      if (imageObjects.length > 1) {
        pdfiumModule.FPDFPage_RemoveObject(page, imageObjects[1]);
      }

      const pPages = pdfiumModule.pdfium.wasmExports.malloc(4);
      new DataView(heap.buffer).setInt32(pPages, page, true);

      // 3. Insert new PNG with transparency (semi-transparent green 4x4)
      const pngImg = pdfiumModule.FPDFPageObj_NewImageObj(doc);
      const bmpPng = pdfiumModule.FPDFBitmap_CreateEx(4, 4, 4, 0, 0);
      // BGRA: semi-transparent green (A=180, R=0, G=220, B=50) -> 0xB400DC32
      pdfiumModule.FPDFBitmap_FillRect(bmpPng, 0, 0, 4, 4, 0xB400DC32);
      pdfiumModule.FPDFImageObj_SetBitmap(pPages, 1, pngImg, bmpPng);
      pdfiumModule.FPDFImageObj_SetMatrix(pngImg, 100, 0, 0, 100, 250, 150);
      pdfiumModule.FPDFPage_InsertObject(page, pngImg);

      // 4. Insert new JPEG/RGB image (opaque blue 4x4)
      const jpgImg = pdfiumModule.FPDFPageObj_NewImageObj(doc);
      const bmpJpg = pdfiumModule.FPDFBitmap_CreateEx(4, 4, 4, 0, 0);
      // BGRA: blue (A=255, R=30, G=100, B=230) -> 0xFF1E64E6
      pdfiumModule.FPDFBitmap_FillRect(bmpJpg, 0, 0, 4, 4, 0xFF1E64E6);
      pdfiumModule.FPDFImageObj_SetBitmap(pPages, 1, jpgImg, bmpJpg);
      pdfiumModule.FPDFImageObj_SetMatrix(jpgImg, 80, 0, 0, 80, 380, 150);
      pdfiumModule.FPDFPage_InsertObject(page, jpgImg);

      // 5. Regenerate page content
      pdfiumModule.FPDFPage_GenerateContent(page);

      // 6. Save new file
      const writer = pdfiumModule.PDFiumExt_OpenFileWriter();
      pdfiumModule.PDFiumExt_SaveAsCopy(doc, writer);
      const savedSize = pdfiumModule.PDFiumExt_GetFileWriterSize(writer);

      const pOutBuf = pdfiumModule.pdfium.wasmExports.malloc(savedSize);
      pdfiumModule.PDFiumExt_GetFileWriterData(writer, pOutBuf, savedSize);
      const savedBytes = new Uint8Array(heap.buffer, pOutBuf, savedSize).slice();

      pdfiumModule.pdfium.wasmExports.free(pPages);
      pdfiumModule.pdfium.wasmExports.free(pOutBuf);
      pdfiumModule.FPDFBitmap_Destroy(bmpPng);
      pdfiumModule.FPDFBitmap_Destroy(bmpJpg);
      pdfiumModule.PDFiumExt_CloseFileWriter(writer);
      pdfiumModule.FPDF_ClosePage(page);
      pdfiumModule.FPDF_CloseDocument(doc);
      pdfiumModule.pdfium.wasmExports.free(pData);

      // 7. Verify the saved file by counting image objects in it
      const pCheck = pdfiumModule.pdfium.wasmExports.malloc(savedBytes.byteLength);
      new Uint8Array(heap.buffer, pCheck, savedBytes.byteLength).set(savedBytes);
      const doc2 = pdfiumModule.FPDF_LoadMemDocument(pCheck, savedBytes.byteLength, '');
      const page2 = pdfiumModule.FPDF_LoadPage(doc2, 0);
      const finalCount = pdfiumModule.FPDFPage_CountObjects(page2);
      let finalImages = 0;
      for (let i = 0; i < finalCount; i++) {
        const obj = pdfiumModule.FPDFPage_GetObject(page2, i);
        if (pdfiumModule.FPDFPageObj_GetType(obj) === 3) finalImages++;
      }
      pdfiumModule.FPDF_ClosePage(page2);
      pdfiumModule.FPDF_CloseDocument(doc2);
      pdfiumModule.pdfium.wasmExports.free(pCheck);

      self.postMessage({
        id,
        type: 'MUTATE_AND_SAVE_IMAGES_SUCCESS',
        result: {
          savedSize,
          initialImages: imageObjects.length,
          finalImages,
          savedBytes: savedBytes.buffer
        }
      }, [savedBytes.buffer]);
      return;
    }

    if (type === 'BENCHMARK_MEMORY') {
      if (!pdfiumModule) throw new Error('PDFium not initialized');
      const { pdfBytes } = payload;
      const heap = getHeap(pdfiumModule);

      const initialHeap = heap.buffer.byteLength;

      // 1. Full load in memory
      const pData = pdfiumModule.pdfium.wasmExports.malloc(pdfBytes.byteLength);
      new Uint8Array(heap.buffer, pData, pdfBytes.byteLength).set(new Uint8Array(pdfBytes));

      const doc = pdfiumModule.FPDF_LoadMemDocument(pData, pdfBytes.byteLength, '');
      const pageCount = pdfiumModule.FPDF_GetPageCount(doc);

      // Render 5 sample pages (e.g., page 0, 25, 50, 75, 99)
      const renderPages = [0, Math.floor(pageCount / 4), Math.floor(pageCount / 2), Math.floor((3 * pageCount) / 4), pageCount - 1];
      const pageRenders = [];

      for (const pIdx of renderPages) {
        const page = pdfiumModule.FPDF_LoadPage(doc, pIdx);
        const w = Math.floor(pdfiumModule.FPDF_GetPageWidthF(page) * 1.0);
        const h = Math.floor(pdfiumModule.FPDF_GetPageHeightF(page) * 1.0);
        const bmp = pdfiumModule.FPDFBitmap_CreateEx(w, h, 4, 0, 0);
        pdfiumModule.FPDFBitmap_FillRect(bmp, 0, 0, w, h, 0xFFFFFFFF);
        pdfiumModule.FPDF_RenderPageBitmap(bmp, page, 0, 0, w, h, 0, 0);

        pdfiumModule.FPDFBitmap_Destroy(bmp);
        pdfiumModule.FPDF_ClosePage(page);
        pageRenders.push(pIdx);
      }

      const peakHeap = getHeap(pdfiumModule).buffer.byteLength;

      pdfiumModule.FPDF_CloseDocument(doc);
      pdfiumModule.pdfium.wasmExports.free(pData);

      const closedHeap = getHeap(pdfiumModule).buffer.byteLength;

      // Thresholds decided:
      // iOS Safari Tab Cap: ~384 MB total JS/WASM heap before tab purge.
      // Recommended File Warning: > 50 MB
      // Recommended Hard Limit: 150 MB (Mobile) / 300 MB (Desktop)
      // Max Virtualized Render Lookahead: 1 page above + 1 page below
      self.postMessage({
        id,
        type: 'BENCHMARK_MEMORY_SUCCESS',
        result: {
          fileSize: pdfBytes.byteLength,
          pageCount,
          pagesRendered: pageRenders.length,
          initialHeapBytes: initialHeap,
          peakHeapBytes: peakHeap,
          closedHeapBytes: closedHeap,
          heapGrowthBytes: peakHeap - initialHeap,
          limits: {
            warningThresholdMB: 50,
            hardLimitMobileMB: 150,
            hardLimitDesktopMB: 300,
            maxTileZoom: 8.0,
            virtualLookaheadPages: 1
          }
        }
      });
      return;
    }

    if (type === 'TEST_ENCRYPTION') {
      if (!pdfiumModule) throw new Error('PDFium not initialized');
      const { encBytes, correctPassword = 'secret123' } = payload;
      const heap = getHeap(pdfiumModule);

      const pData = pdfiumModule.pdfium.wasmExports.malloc(encBytes.byteLength);
      new Uint8Array(heap.buffer, pData, encBytes.byteLength).set(new Uint8Array(encBytes));

      // 1. Try wrong password
      const wrongDoc = pdfiumModule.FPDF_LoadMemDocument(pData, encBytes.byteLength, 'wrong-pwd');
      const wrongErrorCode = pdfiumModule.FPDF_GetLastError();

      // 2. Open with correct password
      const rightDoc = pdfiumModule.FPDF_LoadMemDocument(pData, encBytes.byteLength, correctPassword);
      if (!rightDoc) {
        pdfiumModule.pdfium.wasmExports.free(pData);
        throw new Error('Failed to open with correct password');
      }

      // 3. Remove encryption
      let removeOk = false;
      if (pdfiumModule.EPDF_RemoveEncryption) {
        removeOk = pdfiumModule.EPDF_RemoveEncryption(rightDoc);
      }

      // 4. Save decrypted copy
      const writer = pdfiumModule.PDFiumExt_OpenFileWriter();
      pdfiumModule.PDFiumExt_SaveAsCopy(rightDoc, writer);
      const decSize = pdfiumModule.PDFiumExt_GetFileWriterSize(writer);

      const pOut = pdfiumModule.pdfium.wasmExports.malloc(decSize);
      pdfiumModule.PDFiumExt_GetFileWriterData(writer, pOut, decSize);
      const decBytes = new Uint8Array(heap.buffer, pOut, decSize).slice();

      pdfiumModule.pdfium.wasmExports.free(pOut);
      pdfiumModule.PDFiumExt_CloseFileWriter(writer);
      pdfiumModule.FPDF_CloseDocument(rightDoc);
      pdfiumModule.pdfium.wasmExports.free(pData);

      // 5. Verify saved copy opens with NO password
      const pDec = pdfiumModule.pdfium.wasmExports.malloc(decBytes.byteLength);
      new Uint8Array(heap.buffer, pDec, decBytes.byteLength).set(decBytes);
      const docNoPass = pdfiumModule.FPDF_LoadMemDocument(pDec, decBytes.byteLength, '');
      const opensWithoutPassword = !!docNoPass;
      if (docNoPass) pdfiumModule.FPDF_CloseDocument(docNoPass);
      pdfiumModule.pdfium.wasmExports.free(pDec);

      self.postMessage({
        id,
        type: 'TEST_ENCRYPTION_SUCCESS',
        result: {
          wrongPasswordRejected: !wrongDoc,
          wrongErrorCode,
          rightPasswordAccepted: true,
          removeEncryptionCalled: removeOk,
          savedDecryptedSize: decSize,
          opensWithoutPassword
        }
      });
      return;
    }

    throw new Error(`Unknown command type: ${type}`);
  } catch (err: any) {
    self.postMessage({ id, type: 'ERROR', error: err.message || String(err) });
  }
};
