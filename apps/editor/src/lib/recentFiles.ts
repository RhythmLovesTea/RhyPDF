/**
 * Recent Files Service
 * Manages recent files in IndexedDB: metadata, file handles, thumbnails, last positions,
 * and handles re-requesting permissions and file actions (remove, rename, delete, download).
 */

import { logger } from './logger';
import { loadWorkingCopy, deleteWorkingCopy } from './workingCopy';

export interface RecentFilePosition {
  page: number;
  scale?: number;
  fitMode?: string;
  layoutMode?: string;
  scrollRatio?: number;
}

export interface RecentFileItem {
  id: string;
  name: string;
  fileHandle?: FileSystemFileHandle | null;
  lastOpened: number;
  pageCount: number;
  thumbnail?: string | null;
  lastPosition?: RecentFilePosition;
  size?: number;
}

const IDB_NAME = 'rhypdf_db';
const IDB_VERSION = 1;
const IDB_STORE_RECENTS = 'recent_files';

// In-memory fallback for environments without IndexedDB
const memoryRecents = new Map<string, RecentFileItem>();

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
      if (!db.objectStoreNames.contains(IDB_STORE_RECENTS)) {
        const recentsStore = db.createObjectStore(IDB_STORE_RECENTS, { keyPath: 'id' });
        recentsStore.createIndex('lastOpened', 'lastOpened', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all recent files sorted by lastOpened descending.
 */
export async function getRecentFiles(): Promise<RecentFileItem[]> {
  try {
    const db = await openIdb();
    return await new Promise<RecentFileItem[]>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_RECENTS, 'readonly');
      const store = tx.objectStore(IDB_STORE_RECENTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as RecentFileItem[]) || [];
        items.sort((a, b) => b.lastOpened - a.lastOpened);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const items = Array.from(memoryRecents.values());
    items.sort((a, b) => b.lastOpened - a.lastOpened);
    return items;
  }
}

/**
 * Adds or updates a recent file entry.
 */
export async function addRecentFile(item: RecentFileItem): Promise<void> {
  const itemToStore: RecentFileItem = {
    ...item,
    lastOpened: item.lastOpened || Date.now()
  };

  memoryRecents.set(itemToStore.id, itemToStore);

  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_RECENTS, 'readwrite');
      const store = tx.objectStore(IDB_STORE_RECENTS);
      const req = store.put(itemToStore);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    logger.info('RecentFiles', `Saved recent file: ${itemToStore.name} (${itemToStore.id})`);
  } catch (err) {
    logger.warn('RecentFiles', 'Failed to save recent file to IndexedDB', err);
  }
}

/**
 * Updates a recent file entry partially.
 */
export async function updateRecentFile(
  id: string,
  updates: Partial<RecentFileItem>
): Promise<void> {
  const current = memoryRecents.get(id);
  if (current) {
    memoryRecents.set(id, { ...current, ...updates });
  }

  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_RECENTS, 'readwrite');
      const store = tx.objectStore(IDB_STORE_RECENTS);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as RecentFileItem | undefined;
        if (!existing) {
          resolve();
          return;
        }
        const updated = { ...existing, ...updates };
        memoryRecents.set(id, updated);
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    logger.warn('RecentFiles', `Failed to update recent file ${id}`, err);
  }
}

/**
 * Removes a recent file from the list without deleting its working copy.
 */
export async function removeRecentFile(id: string): Promise<void> {
  memoryRecents.delete(id);

  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_RECENTS, 'readwrite');
      const store = tx.objectStore(IDB_STORE_RECENTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    logger.info('RecentFiles', `Removed recent file from list: ${id}`);
  } catch (err) {
    logger.warn('RecentFiles', `Failed to remove recent file ${id}`, err);
  }
}

/**
 * Renames a recent file entry.
 */
export async function renameRecentFile(id: string, newName: string): Promise<void> {
  const cleanName = newName.trim().endsWith('.pdf') ? newName.trim() : `${newName.trim()}.pdf`;
  await updateRecentFile(id, { name: cleanName });
}

/**
 * Deletes a recent file from IndexedDB AND purges its OPFS/IDB working copy.
 */
export async function deleteRecentFile(id: string): Promise<void> {
  await removeRecentFile(id);
  await deleteWorkingCopy(id);
  logger.info('RecentFiles', `Deleted recent file and purged working copy: ${id}`);
}

/**
 * Re-requests or verifies FileSystemFileHandle permission.
 */
export async function verifyFileHandlePermission(
  handle: FileSystemFileHandle,
  readWrite = false
): Promise<boolean> {
  try {
    const mode = readWrite ? 'readwrite' : 'read';
    const handleWithPerms = handle as unknown as {
      queryPermission?: (options: { mode: string }) => Promise<string>;
      requestPermission?: (options: { mode: string }) => Promise<string>;
    };

    if (typeof handleWithPerms.queryPermission === 'function') {
      const status = await handleWithPerms.queryPermission({ mode });
      if (status === 'granted') return true;
    }

    if (typeof handleWithPerms.requestPermission === 'function') {
      const status = await handleWithPerms.requestPermission({ mode });
      return status === 'granted';
    }
  } catch (err) {
    logger.warn('RecentFiles', 'Permission query/request failed', err);
  }
  return false;
}

/**
 * Triggers a browser download of the recent file.
 */
export async function downloadRecentFile(
  id: string,
  fallbackName = 'document.pdf'
): Promise<boolean> {
  try {
    const bytes = await loadWorkingCopy(id);
    if (!bytes) {
      logger.error('RecentFiles', `Cannot download: no working copy bytes found for doc ${id}`);
      return false;
    }

    const recents = await getRecentFiles();
    const item = recents.find((r) => r.id === id);
    const filename = item?.name || fallbackName;

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logger.info('RecentFiles', `Triggered download for ${filename}`);
    return true;
  } catch (err) {
    logger.error('RecentFiles', `Download failed for doc ${id}`, err);
    return false;
  }
}

/**
 * Clears all recent file records.
 */
export async function clearAllRecentFiles(): Promise<void> {
  memoryRecents.clear();

  try {
    const db = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE_RECENTS, 'readwrite');
      const store = tx.objectStore(IDB_STORE_RECENTS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    logger.info('RecentFiles', 'Cleared all recent files');
  } catch (err) {
    logger.warn('RecentFiles', 'Failed to clear recent files from IndexedDB', err);
  }
}
