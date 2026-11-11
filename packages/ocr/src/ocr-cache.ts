/**
 * @rhypdf/ocr
 * Task 10.5: Per-page OCR Result Cache.
 * Persistent caching in IndexedDB with memory fallback, keyed by pageHash + language.
 */

import type { OcrPageResult } from './types';

const DB_NAME = 'rhypdf_ocr_cache';
const STORE_NAME = 'results';
const DB_VERSION = 1;

export class OcrCache {
  private static instance: OcrCache;
  private memoryMap = new Map<string, OcrPageResult>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  static getInstance(): OcrCache {
    if (!OcrCache.instance) {
      OcrCache.instance = new OcrCache();
    }
    return OcrCache.instance;
  }

  constructor() {
    this.initDb();
  }

  private initDb() {
    if (typeof indexedDB === 'undefined') {
      this.dbPromise = Promise.resolve(null);
      return;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Generates a deterministic cache key for a page image and language.
   */
  generateKey(pageHash: string, language: string, optionsHash = ''): string {
    return `${pageHash}_${language}${optionsHash ? '_' + optionsHash : ''}`;
  }

  /**
   * Retrieves cached OCR result if available.
   */
  async get(key: string): Promise<OcrPageResult | undefined> {
    if (this.memoryMap.has(key)) {
      return this.memoryMap.get(key);
    }

    const db = await this.dbPromise;
    if (!db) return undefined;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const val = req.result as OcrPageResult | undefined;
          if (val) this.memoryMap.set(key, val);
          resolve(val);
        };
        req.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
  }

  /**
   * Saves an OCR result into cache.
   */
  async set(key: string, result: OcrPageResult): Promise<void> {
    this.memoryMap.set(key, result);

    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(result, key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Clears all cached OCR entries.
   */
  async clear(): Promise<void> {
    this.memoryMap.clear();
    const db = await this.dbPromise;
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Checks whether background OCR recognition should throttle because the tab is hidden.
   */
  isTabHidden(): boolean {
    return typeof document !== 'undefined' && Boolean(document.hidden);
  }
}
