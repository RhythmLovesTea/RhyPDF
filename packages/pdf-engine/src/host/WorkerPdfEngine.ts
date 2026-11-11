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
  SaveOptions,
  MemoryStats
} from '../index';
import { PdfError, mapToPdfError } from '../index';
import type { PdfEngineWorkerApi } from '../protocol';

export interface WorkerPdfEngineOptions {
  workerFactory?: () => Worker;
  heapThresholdBytes?: number;
  onWorkerCrash?: (error: unknown) => void;
}

export class WorkerPdfEngine implements PdfEngine {
  private remote: Comlink.Remote<PdfEngineWorkerApi>;
  private workerInstance?: Worker;
  private workerFactory?: () => Worker;
  private heapThresholdBytes: number;
  private onWorkerCrash?: (error: unknown) => void;
  private isCrashed = false;
  private idCounter = 0;

  constructor(endpointOrWorker: Worker | Comlink.Endpoint, options?: WorkerPdfEngineOptions) {
    if (typeof Worker !== 'undefined' && endpointOrWorker instanceof Worker) {
      this.workerInstance = endpointOrWorker;
    }
    this.workerFactory = options?.workerFactory;
    this.onWorkerCrash = options?.onWorkerCrash;
    // Default threshold: 150 MB (standard mobile/Safari threshold)
    this.heapThresholdBytes = options?.heapThresholdBytes ?? 150 * 1024 * 1024;
    this.remote = Comlink.wrap<PdfEngineWorkerApi>(endpointOrWorker);
    this.attachWorkerErrorHandler();
  }

  private attachWorkerErrorHandler(): void {
    if (this.workerInstance && typeof this.workerInstance.addEventListener === 'function') {
      this.workerInstance.addEventListener('error', (event) => {
        this.isCrashed = true;
        if (this.onWorkerCrash) {
          this.onWorkerCrash(event);
        }
      });
    }
  }

  getIsCrashed(): boolean {
    return this.isCrashed;
  }

  private nextId(prefix = 'req'): string {
    this.idCounter++;
    return `${prefix}-${Date.now()}-${this.idCounter}`;
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const pdfErr = mapToPdfError(err);
      if (this.isCrashed || String(err).includes('Worker') || String(err).includes('terminated')) {
        this.isCrashed = true;
        if (this.onWorkerCrash) {
          this.onWorkerCrash(pdfErr);
        }
      }
      throw pdfErr;
    }
  }

  async init(): Promise<boolean> {
    return this.wrap(() => this.remote.init());
  }

  async open(data: ArrayBuffer | Blob, opts?: { password?: string }): Promise<DocumentHandle> {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
    const reqId = this.nextId('open');

    return this.wrap(() => this.remote.open(reqId, Comlink.transfer(buffer, [buffer]), opts));
  }

  async close(doc: DocumentHandle): Promise<void> {
    const reqId = this.nextId('close');
    return this.wrap(async () => {
      await this.remote.close(reqId, doc);
      await this.checkAndRestartWorkerIfThresholdExceeded();
    });
  }

  async closePage(doc: DocumentHandle, page: number): Promise<void> {
    const reqId = this.nextId('closePage');
    return this.wrap(() => this.remote.closePage(reqId, doc, page));
  }

  async pageCount(doc: DocumentHandle): Promise<number> {
    const reqId = this.nextId('count');
    return this.wrap(() => this.remote.pageCount(reqId, doc));
  }

  async pageInfo(doc: DocumentHandle, page: number): Promise<PageInfo> {
    const reqId = this.nextId('info');
    return this.wrap(() => this.remote.pageInfo(reqId, doc, page));
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
      const renderPromise = this.wrap(() => this.remote.renderPage(reqId, doc, page, opts));
      return await Promise.race([renderPromise, abortPromise]);
    } finally {
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
    }
  }

  async getPageObjects(doc: DocumentHandle, page: number): Promise<PageObject[]> {
    const reqId = this.nextId('objects');
    return this.wrap(() => this.remote.getPageObjects(reqId, doc, page));
  }

  async extractText(doc: DocumentHandle, page: number): Promise<TextRun[]> {
    const reqId = this.nextId('text');
    return this.wrap(() => this.remote.extractText(reqId, doc, page));
  }

  async mutate(doc: DocumentHandle, page: number, ops: PageMutation[]): Promise<MutationResult> {
    const reqId = this.nextId('mutate');
    return this.wrap(() => this.remote.mutate(reqId, doc, page, ops));
  }

  async save(doc: DocumentHandle, opts?: SaveOptions): Promise<Blob> {
    const reqId = this.nextId('save');
    const { destination, ...remoteOpts } = opts || {};
    const buffer = await this.wrap(() => this.remote.save(reqId, doc, remoteOpts));
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

  async getMemoryStats(): Promise<MemoryStats> {
    const reqId = this.nextId('memoryStats');
    return this.wrap(() => this.remote.getMemoryStats(reqId));
  }

  async checkAndRestartWorkerIfThresholdExceeded(): Promise<boolean> {
    if (!this.workerFactory) return false;
    try {
      const stats = await this.getMemoryStats();
      if (stats.wasmHeapTotal >= this.heapThresholdBytes && stats.activeDocuments === 0) {
        await this.restartWorker();
        return true;
      }
    } catch {
      // Ignore if worker is busy
    }
    return false;
  }

  async restartWorker(): Promise<void> {
    if (!this.workerFactory) return;
    this.terminate();
    const newWorker = this.workerFactory();
    this.workerInstance = newWorker;
    this.remote = Comlink.wrap<PdfEngineWorkerApi>(newWorker);
    this.attachWorkerErrorHandler();
    this.isCrashed = false;
    await this.init();
  }

  terminate(): void {
    if (this.workerInstance) {
      if (typeof this.workerInstance.terminate === 'function') {
        this.workerInstance.terminate();
      } else if (
        typeof (this.workerInstance as unknown as { close?: () => void }).close === 'function'
      ) {
        (this.workerInstance as unknown as { close: () => void }).close();
      }
    }
  }
}
