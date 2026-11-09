/**
 * @rhypdf/pdf-engine - MockPdfEngine
 * Fully functional in-memory mock implementation of PdfEngine for tests and decoupling.
 * Zero PDFium leaks.
 */

import type { PageInfo, PageObject, TextRun, ImageObject, Rect } from '@rhypdf/pdf-model';
import { CoordinateMapper } from '@rhypdf/pdf-model';
import type {
  PdfEngine,
  DocumentHandle,
  RenderOptions,
  PageMutation,
  MutationResult,
  SaveOptions
} from './index';
import { PdfError } from './index';

interface MockPageState {
  pageIndex: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  cropBox: Rect;
  mediaBox: Rect;
  objects: PageObject[];
}

interface MockDocState {
  id: DocumentHandle;
  password?: string;
  isEncrypted: boolean;
  pages: MockPageState[];
}

export class MockPdfEngine implements PdfEngine {
  private documents = new Map<DocumentHandle, MockDocState>();
  private handleCounter = 0;

  async open(data: ArrayBuffer | Blob, opts?: { password?: string }): Promise<DocumentHandle> {
    const byteLength = data instanceof Blob ? data.size : data.byteLength;
    if (byteLength === 0) {
      throw new PdfError('Corrupt', 'Document buffer is empty');
    }

    // Inspect if caller is asking for encrypted doc simulation
    const isEncryptedSim =
      (typeof data === 'object' &&
        data !== null &&
        '__encrypted' in data &&
        Boolean(data.__encrypted)) ||
      opts?.password === 'wrong_password' ||
      opts?.password === 'secret123';

    if (isEncryptedSim && (!opts?.password || opts.password === '')) {
      throw new PdfError(
        'PasswordRequired',
        'Password is required to open this protected document'
      );
    }
    if (opts?.password === 'wrong_password') {
      throw new PdfError('WrongPassword', 'The provided password was incorrect');
    }

    this.handleCounter++;
    const handle: DocumentHandle = `mock-doc-${this.handleCounter}`;

    const defaultPage: MockPageState = {
      pageIndex: 0,
      width: 595.28, // A4 standard width in points
      height: 841.89, // A4 standard height in points
      rotation: 0,
      mediaBox: { left: 0, bottom: 0, right: 595.28, top: 841.89 },
      cropBox: { left: 0, bottom: 0, right: 595.28, top: 841.89 },
      objects: [
        {
          id: 'text-1',
          type: 'text',
          bounds: { left: 72, bottom: 750, right: 300, top: 770 },
          matrix: [1, 0, 0, 1, 72, 750],
          zIndex: 0,
          text: 'RhyPDF Private Editor',
          fontName: 'Helvetica',
          fontSize: 18,
          fillColor: { r: 26, g: 28, b: 30, a: 255 },
          isEmbeddedSubset: false,
          charBoxes: [
            { char: 'R', box: { left: 72, bottom: 750, right: 86, top: 770 } },
            { char: 'h', box: { left: 86, bottom: 750, right: 98, top: 770 } },
            { char: 'y', box: { left: 98, bottom: 750, right: 108, top: 770 } }
          ]
        },
        {
          id: 'text-2',
          type: 'text',
          bounds: { left: 72, bottom: 710, right: 400, top: 724 },
          matrix: [1, 0, 0, 1, 72, 710],
          zIndex: 1,
          text: 'Your documents never leave your device.',
          fontName: 'Helvetica',
          fontSize: 12,
          fillColor: { r: 100, g: 116, b: 139, a: 255 },
          isEmbeddedSubset: false
        },
        {
          id: 'img-1',
          type: 'image',
          bounds: { left: 72, bottom: 500, right: 272, top: 650 },
          matrix: [200, 0, 0, 150, 72, 500],
          zIndex: 2,
          pixelWidth: 800,
          pixelHeight: 600,
          effectiveDpi: { x: 288, y: 288 },
          format: 'png',
          filters: ['FlateDecode'],
          colorSpace: 'DeviceRGB',
          bitsPerPixel: 24,
          hasMask: false,
          hasSoftMask: false
        }
      ]
    };

    const secondPage: MockPageState = {
      pageIndex: 1,
      width: 595.28,
      height: 841.89,
      rotation: 90,
      mediaBox: { left: 0, bottom: 0, right: 595.28, top: 841.89 },
      cropBox: { left: 0, bottom: 0, right: 595.28, top: 841.89 },
      objects: [
        {
          id: 'text-p2-1',
          type: 'text',
          bounds: { left: 72, bottom: 750, right: 250, top: 764 },
          matrix: [1, 0, 0, 1, 72, 750],
          zIndex: 0,
          text: 'Page 2 Landscape Content',
          fontName: 'Helvetica',
          fontSize: 14,
          fillColor: { r: 0, g: 0, b: 0, a: 255 },
          isEmbeddedSubset: false
        }
      ]
    };

    this.documents.set(handle, {
      id: handle,
      password: opts?.password,
      isEncrypted: isEncryptedSim,
      pages: [defaultPage, secondPage]
    });

    return handle;
  }

  async close(doc: DocumentHandle): Promise<void> {
    if (!this.documents.has(doc)) {
      throw new PdfError(
        'IO',
        `Cannot close document: handle '${doc}' is invalid or already closed`
      );
    }
    this.documents.delete(doc);
  }

  async pageCount(doc: DocumentHandle): Promise<number> {
    const docState = this.getDoc(doc);
    return docState.pages.length;
  }

  async pageInfo(doc: DocumentHandle, page: number): Promise<PageInfo> {
    const pageState = this.getPage(doc, page);
    return {
      pageIndex: pageState.pageIndex,
      width: pageState.width,
      height: pageState.height,
      rotation: pageState.rotation,
      cropBox: pageState.cropBox,
      mediaBox: pageState.mediaBox
    };
  }

  async renderPage(
    doc: DocumentHandle,
    page: number,
    opts: RenderOptions,
    signal?: AbortSignal
  ): Promise<ImageBitmap> {
    if (signal?.aborted) {
      throw new PdfError('Cancelled', 'Render operation was cancelled');
    }

    const pageState = this.getPage(doc, page);
    const mapper = new CoordinateMapper(
      pageState.width,
      pageState.height,
      opts.rotationOverride ?? pageState.rotation,
      opts.scale,
      opts.dpr
    );

    let widthPx: number;
    let heightPx: number;

    if (opts.clipRect) {
      const scale = opts.scale * opts.dpr;
      widthPx = Math.max(1, Math.round((opts.clipRect.right - opts.clipRect.left) * scale));
      heightPx = Math.max(1, Math.round((opts.clipRect.top - opts.clipRect.bottom) * scale));
    } else {
      const bitmapSize = mapper.getBitmapSize();
      widthPx = bitmapSize.width;
      heightPx = bitmapSize.height;
    }

    // Check cancellation again
    if (signal?.aborted) {
      throw new PdfError('Cancelled', 'Render operation was cancelled');
    }

    // In browser context: use browser's createImageBitmap if available
    if (typeof createImageBitmap === 'function' && typeof ImageData === 'function') {
      const clamped = new Uint8ClampedArray(widthPx * heightPx * 4);
      // Fill with mock white background
      clamped.fill(255);
      const imgData = new ImageData(clamped, widthPx, heightPx);
      return await createImageBitmap(imgData);
    }

    // In node/test environment fallback: return ImageBitmap polyfill object
    return {
      width: widthPx,
      height: heightPx,
      close: () => {}
    } as unknown as ImageBitmap;
  }

  async getPageObjects(doc: DocumentHandle, page: number): Promise<PageObject[]> {
    const pageState = this.getPage(doc, page);
    return JSON.parse(JSON.stringify(pageState.objects)) as PageObject[];
  }

  async extractText(doc: DocumentHandle, page: number): Promise<TextRun[]> {
    const objects = await this.getPageObjects(doc, page);
    return objects.filter((o): o is TextRun => o.type === 'text');
  }

  async mutate(doc: DocumentHandle, page: number, ops: PageMutation[]): Promise<MutationResult> {
    const pageState = this.getPage(doc, page);

    for (const op of ops) {
      switch (op.type) {
        case 'removeObject': {
          pageState.objects = pageState.objects.filter((o) => o.id !== op.objectId);
          break;
        }
        case 'insertText': {
          const newId = `text-inserted-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const textObj: TextRun = {
            id: newId,
            type: 'text',
            bounds: {
              left: op.matrix[4],
              bottom: op.matrix[5],
              right: op.matrix[4] + op.fontSize * op.text.length * 0.6,
              top: op.matrix[5] + op.fontSize
            },
            matrix: op.matrix,
            zIndex: pageState.objects.length,
            text: op.text,
            fontName: op.fontName,
            fontSize: op.fontSize,
            fillColor: op.fillColor,
            isEmbeddedSubset: false
          };
          pageState.objects.push(textObj);
          break;
        }
        case 'insertImage': {
          const newId = `img-inserted-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const imgObj: ImageObject = {
            id: newId,
            type: 'image',
            bounds: {
              left: op.matrix[4],
              bottom: op.matrix[5],
              right: op.matrix[4] + op.width,
              top: op.matrix[5] + op.height
            },
            matrix: op.matrix,
            zIndex: pageState.objects.length,
            pixelWidth: op.width,
            pixelHeight: op.height,
            effectiveDpi: { x: 72, y: 72 },
            format: op.format === 'rgba' ? 'raw' : 'jpeg'
          };
          pageState.objects.push(imgObj);
          break;
        }
        case 'setMatrix': {
          const target = pageState.objects.find((o) => o.id === op.objectId);
          if (target) {
            target.matrix = op.matrix;
          }
          break;
        }
        case 'reorderObject': {
          const target = pageState.objects.find((o) => o.id === op.objectId);
          if (target) {
            target.zIndex = op.newZIndex;
            pageState.objects.sort((a, b) => a.zIndex - b.zIndex);
          }
          break;
        }
      }
    }

    return {
      success: true,
      affectedPage: page,
      remainingObjectsCount: pageState.objects.length
    };
  }

  async save(doc: DocumentHandle, opts?: SaveOptions): Promise<Blob> {
    const docState = this.getDoc(doc);
    if (opts?.stripSecurity) {
      docState.isEncrypted = false;
    }

    // Produce valid synthetic PDF header bytes for unit testing and export
    const pdfContent = `%PDF-1.7\n%RhyPDF Mock Engine Exported\n%Pages: ${docState.pages.length}\n%%EOF\n`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(pdfContent);

    return new Blob([bytes], { type: 'application/pdf' });
  }

  private getDoc(doc: DocumentHandle): MockDocState {
    const docState = this.documents.get(doc);
    if (!docState) {
      throw new PdfError('IO', `Invalid or unknown document handle: '${doc}'`);
    }
    return docState;
  }

  private getPage(doc: DocumentHandle, page: number): MockPageState {
    const docState = this.getDoc(doc);
    const pageState = docState.pages[page];
    if (!pageState) {
      throw new PdfError(
        'Unsupported',
        `Page index ${page} is out of range [0, ${docState.pages.length - 1}]`
      );
    }
    return pageState;
  }
}
