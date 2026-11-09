/**
 * EngineService handles the worker-side execution of requests
 * with strict sequential execution via SerializedQueue and Comlink transferables.
 */

import * as Comlink from 'comlink';
import type { PageInfo, PageObject, TextRun } from '@rhypdf/pdf-model';
import type {
  PdfEngine,
  DocumentHandle,
  RenderOptions,
  PageMutation,
  MutationResult,
  SaveOptions,
  MemoryStats
} from '../index';
import type { PdfEngineWorkerApi } from '../protocol';
import { SerializedQueue } from '../queue';
import { MockPdfEngine } from '../mock';

export class EngineService implements PdfEngineWorkerApi {
  private queue = new SerializedQueue();
  private engine: PdfEngine;

  constructor(engine?: PdfEngine) {
    this.engine = engine ?? new MockPdfEngine();
  }

  async init(): Promise<boolean> {
    return true;
  }

  async open(
    requestId: string,
    data: ArrayBuffer,
    opts?: { password?: string }
  ): Promise<DocumentHandle> {
    return this.queue.enqueue(requestId, () => this.engine.open(data, opts));
  }

  async close(requestId: string, doc: DocumentHandle): Promise<void> {
    return this.queue.enqueue(requestId, () => this.engine.close(doc));
  }

  async closePage(requestId: string, doc: DocumentHandle, page: number): Promise<void> {
    return this.queue.enqueue(requestId, async () => {
      if (typeof this.engine.closePage === 'function') {
        await this.engine.closePage(doc, page);
      }
    });
  }

  async pageCount(requestId: string, doc: DocumentHandle): Promise<number> {
    return this.queue.enqueue(requestId, () => this.engine.pageCount(doc));
  }

  async pageInfo(requestId: string, doc: DocumentHandle, page: number): Promise<PageInfo> {
    return this.queue.enqueue(requestId, () => this.engine.pageInfo(doc, page));
  }

  async renderPage(
    requestId: string,
    doc: DocumentHandle,
    page: number,
    opts: RenderOptions
  ): Promise<ImageBitmap> {
    return this.queue.enqueue(requestId, async () => {
      const bitmap = await this.engine.renderPage(doc, page, opts);
      // If environment supports Transferable ImageBitmap, wrap in Comlink.transfer
      if (typeof bitmap === 'object' && bitmap !== null && 'close' in bitmap) {
        return Comlink.transfer(bitmap, [bitmap]);
      }
      return bitmap;
    });
  }

  async getPageObjects(
    requestId: string,
    doc: DocumentHandle,
    page: number
  ): Promise<PageObject[]> {
    return this.queue.enqueue(requestId, () => this.engine.getPageObjects(doc, page));
  }

  async extractText(requestId: string, doc: DocumentHandle, page: number): Promise<TextRun[]> {
    return this.queue.enqueue(requestId, () => this.engine.extractText(doc, page));
  }

  async mutate(
    requestId: string,
    doc: DocumentHandle,
    page: number,
    ops: PageMutation[]
  ): Promise<MutationResult> {
    return this.queue.enqueue(requestId, () => this.engine.mutate(doc, page, ops));
  }

  async save(requestId: string, doc: DocumentHandle, opts?: SaveOptions): Promise<ArrayBuffer> {
    return this.queue.enqueue(requestId, async () => {
      const blob = await this.engine.save(doc, opts);
      const buffer = await blob.arrayBuffer();
      return Comlink.transfer(buffer, [buffer]);
    });
  }

  async cancel(requestId: string): Promise<boolean> {
    return this.queue.cancel(requestId);
  }

  async getQueueLength(): Promise<number> {
    return this.queue.length;
  }

  async getMemoryStats(requestId: string): Promise<MemoryStats> {
    return this.queue.enqueue(requestId, async () => {
      if (typeof this.engine.getMemoryStats === 'function') {
        return this.engine.getMemoryStats();
      }
      return { wasmHeapTotal: 0, activeDocuments: 0, activePages: 0 };
    });
  }
}
