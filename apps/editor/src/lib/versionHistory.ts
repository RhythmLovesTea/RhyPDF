/**
 * Version History Service (Task 14.9)
 * Stores the last N saves in OPFS (under 'rhypdf_versions/<docId>/') or IndexedDB.
 * Allows viewing, restoring, and managing historical versions.
 */

import { logger } from './logger';
import type { VersionRecord } from '@rhypdf/edit-core';

const OPFS_VERSIONS_DIR = 'rhypdf_versions';
const IDB_NAME = 'rhypdf_db';
const IDB_VERSION = 1;
const IDB_STORE_VERSIONS = 'doc_versions';
const MAX_VERSIONS_PER_DOC = 10;
const SETTINGS_KEY_VERSION_HISTORY = 'rhypdf_version_history_enabled';

// In-memory fallback
const memoryVersions = new Map<string, { record: VersionRecord; bytes: ArrayBuffer }[]>();

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
      await root.getDirectoryHandle('__opfs_test__', { create: true });
      await root.removeEntry('__opfs_test__');
      isOpfsSupportedCached = true;
      return true;
    }
  } catch {
    // ignore
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
      if (!db.objectStoreNames.contains('working_copies')) {
        db.createObjectStore('working_copies', { keyPath: 'docId' });
      }
      if (!db.objectStoreNames.contains('recent_files')) {
        const recentsStore = db.createObjectStore('recent_files', { keyPath: 'id' });
        recentsStore.createIndex('lastOpened', 'lastOpened', { unique: false });
      }
      if (!db.objectStoreNames.contains(IDB_STORE_VERSIONS)) {
        const versionsStore = db.createObjectStore(IDB_STORE_VERSIONS, { keyPath: 'id' });
        versionsStore.createIndex('docId', 'docId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Checks whether version history is enabled.
 */
export function isVersionHistoryEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  const val = localStorage.getItem(SETTINGS_KEY_VERSION_HISTORY);
  return val === null ? true : val === 'true';
}

/**
 * Sets version history enabled preference.
 */
export function setVersionHistoryEnabled(enabled: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SETTINGS_KEY_VERSION_HISTORY, String(enabled));
  }
}

/**
 * Saves a new version record and binary data for a document.
 */
export async function saveDocumentVersion(
  docId: string,
  filename: string,
  bytes: Uint8Array | ArrayBuffer,
  description?: string
): Promise<VersionRecord | null> {
  if (!isVersionHistoryEnabled()) {
    return null;
  }

  const arrayBuffer =
    bytes instanceof Uint8Array
      ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      : bytes;

  const timestamp = Date.now();
  const existing = await getDocumentVersions(docId);
  const versionNumber = existing.length > 0 ? Math.max(...existing.map((v) => v.versionNumber)) + 1 : 1;
  const id = `ver_${docId}_${timestamp}_${versionNumber}`;

  const record: VersionRecord = {
    id,
    docId,
    versionNumber,
    timestamp,
    sizeBytes: arrayBuffer.byteLength,
    filename,
    description: description || `Version ${versionNumber}`
  };

  // 1. Try OPFS
  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      const versionsRoot = await root.getDirectoryHandle(OPFS_VERSIONS_DIR, { create: true });
      const docDir = await versionsRoot.getDirectoryHandle(docId, { create: true });
      const fileHandle = await docDir.getFileHandle(`${id}.pdf`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(arrayBuffer);
      await writable.close();

      // Write meta JSON
      const metaHandle = await docDir.getFileHandle(`${id}.json`, { create: true });
      const metaWritable = await metaHandle.createWritable();
      await metaWritable.write(new TextEncoder().encode(JSON.stringify(record)));
      await metaWritable.close();

      // Prune old versions if > MAX_VERSIONS_PER_DOC
      await pruneOpfsVersions(docId);
      logger.info('VersionHistory', `Saved version ${versionNumber} for ${docId} in OPFS`);
      return record;
    } catch (err) {
      logger.warn('VersionHistory', 'OPFS save failed, falling back to IDB', err);
    }
  }

  // 2. Try IndexedDB
  try {
    const db = await openIdb();
    if (db.objectStoreNames.contains(IDB_STORE_VERSIONS)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_VERSIONS, 'readwrite');
        const store = tx.objectStore(IDB_STORE_VERSIONS);
        const req = store.put({ ...record, data: new Blob([arrayBuffer]) });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      await pruneIdbVersions(docId, db);
      logger.info('VersionHistory', `Saved version ${versionNumber} for ${docId} in IDB`);
      return record;
    }
  } catch (err) {
    logger.warn('VersionHistory', 'IDB save failed, falling back to memory', err);
  }

  // 3. Memory fallback
  const list = memoryVersions.get(docId) || [];
  list.push({ record, bytes: arrayBuffer });
  if (list.length > MAX_VERSIONS_PER_DOC) {
    list.shift();
  }
  memoryVersions.set(docId, list);
  return record;
}

/**
 * Retrieves all saved versions for a document, sorted descending by timestamp.
 */
export async function getDocumentVersions(docId: string): Promise<VersionRecord[]> {
  // 1. Try OPFS
  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      const versionsRoot = await root.getDirectoryHandle(OPFS_VERSIONS_DIR, { create: false });
      const docDir = await versionsRoot.getDirectoryHandle(docId, { create: false });
      const records: VersionRecord[] = [];

      // @ts-expect-error FileSystemDirectoryHandle values iterator
      for await (const entry of docDir.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          const file = await (entry as FileSystemFileHandle).getFile();
          const text = await file.text();
          records.push(JSON.parse(text) as VersionRecord);
        }
      }

      records.sort((a, b) => b.timestamp - a.timestamp);
      return records;
    } catch {
      // Fall through
    }
  }

  // 2. Try IndexedDB
  try {
    const db = await openIdb();
    if (db.objectStoreNames.contains(IDB_STORE_VERSIONS)) {
      const all = await new Promise<VersionRecord[]>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_VERSIONS, 'readonly');
        const store = tx.objectStore(IDB_STORE_VERSIONS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as VersionRecord[]);
        req.onerror = () => reject(req.error);
      });
      const filtered = all.filter((v) => v.docId === docId);
      filtered.sort((a, b) => b.timestamp - a.timestamp);
      return filtered;
    }
  } catch {
    // Fall through
  }

  // 3. Memory
  const list = memoryVersions.get(docId) || [];
  const records = list.map((item) => item.record);
  records.sort((a, b) => b.timestamp - a.timestamp);
  return records;
}

/**
 * Restores binary bytes for a specific version.
 */
export async function restoreDocumentVersion(
  docId: string,
  versionId: string
): Promise<Uint8Array | null> {
  // 1. Try OPFS
  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      const versionsRoot = await root.getDirectoryHandle(OPFS_VERSIONS_DIR, { create: false });
      const docDir = await versionsRoot.getDirectoryHandle(docId, { create: false });
      const fileHandle = await docDir.getFileHandle(`${versionId}.pdf`, { create: false });
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      // Fall through
    }
  }

  // 2. Try IndexedDB
  try {
    const db = await openIdb();
    if (db.objectStoreNames.contains(IDB_STORE_VERSIONS)) {
      const result = await new Promise<{ data: Blob | ArrayBuffer } | undefined>(
        (resolve, reject) => {
          const tx = db.transaction(IDB_STORE_VERSIONS, 'readonly');
          const store = tx.objectStore(IDB_STORE_VERSIONS);
          const req = store.get(versionId);
          req.onsuccess = () => resolve(req.result as { data: Blob | ArrayBuffer });
          req.onerror = () => reject(req.error);
        }
      );
      if (result) {
        if (result.data instanceof Blob) {
          const buf = await result.data.arrayBuffer();
          return new Uint8Array(buf);
        }
        return new Uint8Array(result.data);
      }
    }
  } catch {
    // Fall through
  }

  // 3. Memory
  const list = memoryVersions.get(docId) || [];
  const found = list.find((item) => item.record.id === versionId);
  return found ? new Uint8Array(found.bytes) : null;
}

/**
 * Deletes a single version.
 */
export async function deleteDocumentVersion(docId: string, versionId: string): Promise<void> {
  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      const versionsRoot = await root.getDirectoryHandle(OPFS_VERSIONS_DIR, { create: false });
      const docDir = await versionsRoot.getDirectoryHandle(docId, { create: false });
      await docDir.removeEntry(`${versionId}.pdf`);
      await docDir.removeEntry(`${versionId}.json`);
    } catch {
      // ignore
    }
  }

  try {
    const db = await openIdb();
    if (db.objectStoreNames.contains(IDB_STORE_VERSIONS)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_VERSIONS, 'readwrite');
        const store = tx.objectStore(IDB_STORE_VERSIONS);
        const req = store.delete(versionId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch {
    // ignore
  }

  const list = memoryVersions.get(docId) || [];
  memoryVersions.set(
    docId,
    list.filter((item) => item.record.id !== versionId)
  );
}

/**
 * Clears all version history for a given document.
 */
export async function clearDocumentVersions(docId: string): Promise<void> {
  if (await isOpfsSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      const versionsRoot = await root.getDirectoryHandle(OPFS_VERSIONS_DIR, { create: false });
      await versionsRoot.removeEntry(docId, { recursive: true });
    } catch {
      // ignore
    }
  }

  try {
    const db = await openIdb();
    if (db.objectStoreNames.contains(IDB_STORE_VERSIONS)) {
      const versions = await getDocumentVersions(docId);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_VERSIONS, 'readwrite');
        const store = tx.objectStore(IDB_STORE_VERSIONS);
        for (const v of versions) {
          store.delete(v.id);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {
    // ignore
  }

  memoryVersions.delete(docId);
}

async function pruneOpfsVersions(docId: string): Promise<void> {
  try {
    const versions = await getDocumentVersions(docId);
    if (versions.length > MAX_VERSIONS_PER_DOC) {
      const toRemove = versions.slice(MAX_VERSIONS_PER_DOC);
      for (const item of toRemove) {
        await deleteDocumentVersion(docId, item.id);
      }
    }
  } catch {
    // ignore
  }
}

async function pruneIdbVersions(docId: string, db: IDBDatabase): Promise<void> {
  try {
    const versions = await getDocumentVersions(docId);
    if (versions.length > MAX_VERSIONS_PER_DOC) {
      const toRemove = versions.slice(MAX_VERSIONS_PER_DOC);
      const tx = db.transaction(IDB_STORE_VERSIONS, 'readwrite');
      const store = tx.objectStore(IDB_STORE_VERSIONS);
      for (const item of toRemove) {
        store.delete(item.id);
      }
    }
  } catch {
    // ignore
  }
}
