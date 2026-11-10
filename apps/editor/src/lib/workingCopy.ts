/**
 * Working-Copy System
 * On document open, copies bytes to OPFS (Origin Private File System) with IndexedDB Blob fallback.
 * Ensures original files are never overwritten during edits.
 */

import { logger } from './logger';

export type WorkingCopyStorageType = 'opfs' | 'idb' | 'memory';

const OPFS_DIR = 'rhypdf_working_copies';
const IDB_NAME = 'rhypdf_db';
const IDB_VERSION = 1;
const IDB_STORE_WORKING_COPIES = 'working_copies';

// In-memory fallback map for environments where neither OPFS nor IndexedDB is available (e.g. test runner)
const memoryStorage = new Map<string, ArrayBuffer>();

let isOpfsSupportedCached: boolean | null = null;

async function isOpfsSupported(): Promise<boolean> {
  if (isOpfsSupportedCached !== null) return isOpfsSupportedCached;
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.getDirectory === 'function'
    ) {
      const root = await navigator.storage.getDirectory();
      // Test creating a directory
      await root.getDirectoryHandle('__opfs_test__', { create: true });
      await root.removeEntry('__opfs_test__');
      isOpfsSupportedCached = true;
      return true;
    }
  } catch (err) {
    logger.info('WorkingCopy', 'OPFS not supported or restricted, falling back to IndexedDB', err);
  }
  isOpfsSupportedCached = false;
  return false;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not available'));
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_WORKING_COPIES)) {
        db.createObjectStore(IDB_STORE_WORKING_COPIES, { keyPath: 'docId' });
      }
      if (!db.objectStoreNames.contains('recent_files')) {
        const recentsStore = db.createObjectStore('recent_files', { keyPath: 'id' });
        recentsStore.createIndex('lastOpened', 'lastOpened', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves working copy bytes into OPFS, falling back to IndexedDB or memory.
 */
export async function saveWorkingCopy(
  docId: string,
  data: ArrayBuffer | Uint8Array | Blob
): Promise<{ docId: string; storageType: WorkingCopyStorageType }> {
  let arrayBuffer: ArrayBuffer;
  if (data instanceof Blob) {
    arrayBuffer = await data.arrayBuffer();
  } else if (data instanceof Uint8Array) {
    arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  } else {
    arrayBuffer = data;
  }

  // 1. Try OPFS
  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle(OPFS_DIR, { create: true });
      const fileHandle = await dir.getFileHandle(`${docId}.pdf`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(arrayBuffer);
      await writable.close();
      logger.info(
        'WorkingCopy',
        `Saved working copy to OPFS for doc ${docId} (${arrayBuffer.byteLength} bytes)`
      );
      return { docId, storageType: 'opfs' };
    } catch (err) {
      logger.warn('WorkingCopy', 'OPFS save failed, trying IndexedDB fallback', err);
    }
  }

  // 2. Try IndexedDB
  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_WORKING_COPIES, 'readwrite');
      const store = tx.objectStore(IDB_STORE_WORKING_COPIES);
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const req = store.put({ docId, data: blob, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    logger.info(
      'WorkingCopy',
      `Saved working copy to IndexedDB for doc ${docId} (${arrayBuffer.byteLength} bytes)`
    );
    return { docId, storageType: 'idb' };
  } catch (err) {
    logger.warn('WorkingCopy', 'IndexedDB save failed, falling back to in-memory', err);
  }

  // 3. In-memory storage fallback
  memoryStorage.set(docId, arrayBuffer);
  logger.info('WorkingCopy', `Saved working copy in memory for doc ${docId}`);
  return { docId, storageType: 'memory' };
}

/**
 * Loads the working copy bytes for a given docId.
 */
export async function loadWorkingCopy(docId: string): Promise<ArrayBuffer | null> {
  // 1. Try OPFS
  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle(OPFS_DIR, { create: false });
      const fileHandle = await dir.getFileHandle(`${docId}.pdf`, { create: false });
      const file = await fileHandle.getFile();
      return await file.arrayBuffer();
    } catch {
      // File not found in OPFS, try IDB
    }
  }

  // 2. Try IndexedDB
  try {
    const db = await openIdb();
    const result = await new Promise<{ docId: string; data: Blob | ArrayBuffer } | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(IDB_STORE_WORKING_COPIES, 'readonly');
        const store = tx.objectStore(IDB_STORE_WORKING_COPIES);
        const req = store.get(docId);
        req.onsuccess = () => resolve(req.result as { docId: string; data: Blob | ArrayBuffer });
        req.onerror = () => reject(req.error);
      }
    );

    if (result) {
      if (result.data instanceof Blob) {
        return await result.data.arrayBuffer();
      }
      return result.data;
    }
  } catch {
    // IDB error, try in-memory
  }

  // 3. Try In-memory
  if (memoryStorage.has(docId)) {
    return memoryStorage.get(docId)!;
  }

  return null;
}

/**
 * Deletes the working copy for a document.
 */
export async function deleteWorkingCopy(docId: string): Promise<void> {
  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle(OPFS_DIR, { create: false });
      await dir.removeEntry(`${docId}.pdf`);
    } catch {
      // Ignore if not found
    }
  }

  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_WORKING_COPIES, 'readwrite');
      const store = tx.objectStore(IDB_STORE_WORKING_COPIES);
      const req = store.delete(docId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore IDB errors
  }

  memoryStorage.delete(docId);
}

/**
 * Checks whether a working copy exists for a given docId.
 */
export async function hasWorkingCopy(docId: string): Promise<boolean> {
  if (memoryStorage.has(docId)) return true;

  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle(OPFS_DIR, { create: false });
      await dir.getFileHandle(`${docId}.pdf`, { create: false });
      return true;
    } catch {
      // Fall through to IDB
    }
  }

  try {
    const db = await openIdb();
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_WORKING_COPIES, 'readonly');
      const store = tx.objectStore(IDB_STORE_WORKING_COPIES);
      const req = store.count(docId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Clears all working copies from OPFS, IndexedDB, and memory.
 */
export async function clearAllWorkingCopies(): Promise<void> {
  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      await root.removeEntry(OPFS_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  }

  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_WORKING_COPIES, 'readwrite');
      const store = tx.objectStore(IDB_STORE_WORKING_COPIES);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore
  }

  memoryStorage.clear();
  logger.info('WorkingCopy', 'Cleared all working copies');
}
