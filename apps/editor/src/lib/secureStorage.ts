/**
 * Secure Storage & Data Hygiene Service (Task 15.8)
 * Ensures working copies and temporary data are wiped on document close or export.
 * Provides a one-click "Clear all local data" action and auto-expires recovery items older than 7 days.
 */

import { logger } from './logger';
import { clearAllWorkingCopies, deleteWorkingCopy } from './workingCopy';
import { clearAllRecentFiles } from './recentFiles';
import { clearRecoveryForDoc, listRecoverableDocs } from './recovery';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Wipes working copies and temporary caches for a specific document (Task 15.8).
 */
export async function wipeDocumentWorkingData(docId: string): Promise<void> {
  try {
    await deleteWorkingCopy(docId);
    await clearRecoveryForDoc(docId);
    logger.info('SecureStorage', `Wiped working data for doc ${docId}`);
  } catch (err) {
    logger.warn('SecureStorage', `Failed to wipe working data for doc ${docId}`, err);
  }
}

/**
 * Clears ALL local data across OPFS, IndexedDB, and localStorage (Task 15.8).
 */
export async function clearAllLocalData(): Promise<void> {
  try {
    // 1. Clear working copies (OPFS + IDB)
    await clearAllWorkingCopies();

    // 2. Clear recent files (IDB)
    await clearAllRecentFiles();

    // 3. Clear version history directories in OPFS
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.getDirectory === 'function'
    ) {
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry('rhypdf_versions', { recursive: true });
      } catch {
        // ignore
      }
    }

    // 4. Clear local storage preferences and cached keys
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rhypdf_')) {
          keysToRemove.push(key);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    }

    logger.info('SecureStorage', 'Successfully wiped all local application data');
  } catch (err) {
    logger.error('SecureStorage', 'Failed to clear all local data', err);
  }
}

/**
 * Auto-expires recovery sessions older than 7 days (Task 15.8).
 */
export async function pruneExpiredRecovery(maxAgeMs = SEVEN_DAYS_MS): Promise<number> {
  try {
    const recoverable = await listRecoverableDocs();
    const now = Date.now();
    let prunedCount = 0;

    for (const doc of recoverable) {
      if (now - doc.timestamp > maxAgeMs) {
        await clearRecoveryForDoc(doc.docId);
        prunedCount++;
      }
    }

    if (prunedCount > 0) {
      logger.info(
        'SecureStorage',
        `Pruned ${prunedCount} expired recovery records older than 7 days`
      );
    }
    return prunedCount;
  } catch (err) {
    logger.warn('SecureStorage', 'Failed to prune expired recovery files', err);
    return 0;
  }
}
