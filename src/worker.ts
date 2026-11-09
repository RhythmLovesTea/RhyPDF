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
      const { pdfBytes, pageIndex } = payload;
      const heap = getHeap(pdfiumModule);
      const pData = pdfiumModule.pdfium.wasmExports.malloc(pdfBytes.byteLength);
      new Uint8Array(heap.buffer, pData, pdfBytes.byteLength).set(new Uint8Array(pdfBytes));

      const doc = pdfiumModule.FPDF_LoadMemDocument(pData, pdfBytes.byteLength, '');
      const page = pdfiumModule.FPDF_LoadPage(doc, pageIndex);
      const count = pdfiumModule.FPDFPage_CountObjects(page);
      const objects = [];

      for (let i = 0; i < count; i++) {
        const obj = pdfiumModule.FPDFPage_GetObject(page, i);
        const objType = pdfiumModule.FPDFPageObj_GetType(obj);
        // Types: 1 = TEXT, 2 = PATH, 3 = IMAGE, 4 = SHADING, 5 = FORMXOBJECT
        const typeName = objType === 1 ? 'TEXT' : objType === 2 ? 'PATH' : objType === 3 ? 'IMAGE' : objType === 5 ? 'FORM' : 'OTHER';

        // Get bounds
        const pLeft = pdfiumModule.pdfium.wasmExports.malloc(4);
        const pBottom = pdfiumModule.pdfium.wasmExports.malloc(4);
        const pRight = pdfiumModule.pdfium.wasmExports.malloc(4);
        const pTop = pdfiumModule.pdfium.wasmExports.malloc(4);

        pdfiumModule.FPDFPageObj_GetBounds(obj, pLeft, pBottom, pRight, pTop);
        const view = new DataView(heap.buffer);
        const left = view.getFloat32(pLeft, true);
        const bottom = view.getFloat32(pBottom, true);
        const right = view.getFloat32(pRight, true);
        const top = view.getFloat32(pTop, true);

        pdfiumModule.pdfium.wasmExports.free(pLeft);
        pdfiumModule.pdfium.wasmExports.free(pBottom);
        pdfiumModule.pdfium.wasmExports.free(pRight);
        pdfiumModule.pdfium.wasmExports.free(pTop);

        objects.push({ index: i, type: typeName, bounds: { left, bottom, right, top } });
      }

      pdfiumModule.FPDF_ClosePage(page);
      pdfiumModule.FPDF_CloseDocument(doc);
      pdfiumModule.pdfium.wasmExports.free(pData);

      self.postMessage({ id, type: 'PAGE_OBJECTS_SUCCESS', result: { count, objects } });
      return;
    }

    throw new Error(`Unknown command type: ${type}`);
  } catch (err: any) {
    self.postMessage({ id, type: 'ERROR', error: err.message || String(err) });
  }
};
