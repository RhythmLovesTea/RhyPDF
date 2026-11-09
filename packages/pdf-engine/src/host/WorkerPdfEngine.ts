/**
 * WorkerPdfEngine
 * Implements PdfEngine on the main thread via Comlink RPC to a Web Worker.
 * Handles AbortSignal cancellation, argument transferables, and serialized execution.
 */

import * as Comlink from 'comlink';
import type { PageInfo, PageObject, TextRun } from '@rhypdf/pdf-model';
import type {
  PdfEngine,
  DocumentHandle,
  RenderOptions,
  PageMutation,
  MutationResult,
  SaveOptions
} from '../index';
import { PdfError } from '../index';
import type { PdfEngineWorkerApi } from '../protocol';

export class WorkerPdfEngine implements PdfEngine {
  private remote: Comlink.Remote<PdfEngineWorkerApi>;
  private workerInstance?: Worker;
  private idCounter = 0;

  constructor(endpointOrWorker: Worker | Comlink.Endpoint) {
    if (typeof Worker !== 'undefined' && endpointOrWorker instanceof Worker) {
      this.workerInstance = endpointOrWorker;
    }
    this.remote = Comlink.wrap<PdfEngineWorkerApi>(endpointOrWorker);
  }

  private nextId(prefix = 'req'): string {
    this.idCounter++;
    return `${prefix}-${Date.now()}-${this.idCounter}`;
  }

  async init(): Promise<boolean> {
    return this.remote.init();
  }

  async open(data: ArrayBuffer | Blob, opts?: { password?: string }): Promise<DocumentHandle> {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
    const reqId = this.nextId('open');

    // Transfer buffer to worker to avoid memory copies
    return this.remote.open(reqId, Comlink.transfer(buffer, [buffer]), opts);
  }

  async close(doc: DocumentHandle): Promise<void> {
    const reqId = this.nextId('close');
    return this.remote.close(reqId, doc);
  }

  async pageCount(doc: DocumentHandle): Promise<number> {
    const reqId = this.nextId('count');
    return this.remote.pageCount(reqId, doc);
  }

  async pageInfo(doc: DocumentHandle, page: number): Promise<PageInfo> {
    const reqId = this.nextId('info');
    return this.remote.pageInfo(reqId, doc, page);
  }

  async renderPage(
    doc: DocumentHandle,
    page: number,
    opts: RenderOptions,
    signal?: AbortSignal
  ): Promise<ImageBitmap> {
    if (signal?.aborted) {
      throw new PdfError('Cancelled', 'Render operation was cancelled prior to execution');
    }

    const reqId = this.nextId('render');

    // Setup abort listener if signal is provided
    let abortListener: (() => void) | undefined;
    const abortPromise = new Promise<never>((_, reject) => {
      if (signal) {
        abortListener = () => {
          this.remote.cancel(reqId).catch(() => {});
          reject(new PdfError('Cancelled', `Render of page ${page} was cancelled by caller`));
        };
        signal.addEventListener('abort', abortListener, { once: true });
      }
    });

    try {
      const renderPromise = this.remote.renderPage(reqId, doc, page, opts);
      return await Promise.race([renderPromise, abortPromise]);
    } finally {
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
    }
  }

  async getPageObjects(doc: DocumentHandle, page: number): Promise<PageObject[]> {
    const reqId = this.nextId('objects');
    return this.remote.getPageObjects(reqId, doc, page);
  }

  async extractText(doc: DocumentHandle, page: number): Promise<TextRun[]> {
    const reqId = this.nextId('text');
    return this.remote.extractText(reqId, doc, page);
  }

  async mutate(doc: DocumentHandle, page: number, ops: PageMutation[]): Promise<MutationResult> {
    const reqId = this.nextId('mutate');
    return this.remote.mutate(reqId, doc, page, ops);
  }

  async save(doc: DocumentHandle, opts?: SaveOptions): Promise<Blob> {
    const reqId = this.nextId('save');
    const { destination, ...remoteOpts } = opts || {};
    const buffer = await this.remote.save(reqId, doc, remoteOpts);
    if (destination) {
      const streamWriter = destination.getWriter();
      const u8 = new Uint8Array(buffer);
      const chunkSize = 64 * 1024;
      for (let offset = 0; offset < u8.byteLength; offset += chunkSize) {
        await streamWriter.write(u8.subarray(offset, Math.min(offset + chunkSize, u8.byteLength)));
      }
      await streamWriter.close();
    }
    return new Blob([buffer], { type: 'application/pdf' });
  }

  async getQueueLength(): Promise<number> {
    return this.remote.getQueueLength();
  }

  terminate(): void {
    if (this.workerInstance) {
      this.workerInstance.terminate();
    }
  }
}
