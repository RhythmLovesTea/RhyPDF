/**
 * RPC protocol definitions for communication between UI host and PDF worker.
 */

import type { PageInfo, PageObject, TextRun } from '@rhypdf/pdf-model';
import type {
  DocumentHandle,
  RenderOptions,
  PageMutation,
  MutationResult,
  SaveOptions,
  MemoryStats
} from './index';

export interface PdfEngineWorkerApi {
  init(): Promise<boolean>;
  open(requestId: string, data: ArrayBuffer, opts?: { password?: string }): Promise<DocumentHandle>;
  close(requestId: string, doc: DocumentHandle): Promise<void>;
  closePage(requestId: string, doc: DocumentHandle, page: number): Promise<void>;
  pageCount(requestId: string, doc: DocumentHandle): Promise<number>;
  pageInfo(requestId: string, doc: DocumentHandle, page: number): Promise<PageInfo>;
  renderPage(
    requestId: string,
    doc: DocumentHandle,
    page: number,
    opts: RenderOptions
  ): Promise<ImageBitmap>;
  getPageObjects(requestId: string, doc: DocumentHandle, page: number): Promise<PageObject[]>;
  extractText(requestId: string, doc: DocumentHandle, page: number): Promise<TextRun[]>;
  mutate(
    requestId: string,
    doc: DocumentHandle,
    page: number,
    ops: PageMutation[]
  ): Promise<MutationResult>;
  save(requestId: string, doc: DocumentHandle, opts?: SaveOptions): Promise<ArrayBuffer>;
  cancel(requestId: string): Promise<boolean>;
  getQueueLength(): Promise<number>;
  getMemoryStats(requestId: string): Promise<MemoryStats>;
}
