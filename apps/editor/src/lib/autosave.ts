/**
 * Autosave Manager
 * Automatically saves working copy and command-log snapshot every N seconds
 * and on visibilitychange / pagehide / beforeunload.
 */

import { logger } from './logger';
import { saveWorkingCopy } from './workingCopy';
import { saveRecoveryMetadata } from './recovery';

export interface AutosaveOptions {
  docId: string;
  filename: string;
  intervalMs?: number; // default 5000 ms
  getActivePageIndex?: () => number;
  getBytes?: () => Promise<ArrayBuffer | Uint8Array> | ArrayBuffer | Uint8Array;
  getCommandLog?: () => unknown[];
  isDirty?: () => boolean;
  onSaved?: (timestamp: number) => void;
}

export class AutosaveManager {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isDestroyed = false;
  private isSaving = false;

  constructor(private options: AutosaveOptions) {
    this.init();
  }

  private init(): void {
    const interval = this.options.intervalMs ?? 5000;
    this.timer = setInterval(() => {
      void this.saveIfDirty('interval');
    }, interval);

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.handlePageHide);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }

    logger.info(
      'Autosave',
      `Autosave active for doc ${this.options.docId} (interval: ${interval}ms)`
    );
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      void this.saveIfDirty('visibilitychange');
    }
  };

  private handlePageHide = (): void => {
    void this.saveIfDirty('pagehide');
  };

  private handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    const dirty = this.options.isDirty ? this.options.isDirty() : false;
    if (dirty) {
      event.preventDefault();
      event.returnValue = '';
      void this.saveIfDirty('beforeunload');
    }
  };

  /**
   * Performs save if the document is marked dirty or force is true.
   */
  public async saveIfDirty(reason = 'manual', force = false): Promise<boolean> {
    if (this.isDestroyed || this.isSaving) return false;
    const dirty = force || (this.options.isDirty ? this.options.isDirty() : false);
    if (!dirty) return false;

    this.isSaving = true;
    try {
      if (this.options.getBytes) {
        const bytes = await this.options.getBytes();
        await saveWorkingCopy(this.options.docId, bytes);
      }

      const activePageIndex = this.options.getActivePageIndex
        ? this.options.getActivePageIndex()
        : 0;
      saveRecoveryMetadata({
        documentId: this.options.docId,
        filename: this.options.filename,
        activePageIndex,
        isDirty: true,
        errorReason: `Unsaved session autosaved (${reason})`
      });

      const now = Date.now();
      this.options.onSaved?.(now);
      logger.info('Autosave', `Autosaved document ${this.options.docId} [trigger=${reason}]`);
      return true;
    } catch (err) {
      logger.error('Autosave', `Failed to autosave doc ${this.options.docId}`, err);
      return false;
    } finally {
      this.isSaving = false;
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.handlePageHide);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    logger.info('Autosave', `Autosave stopped for doc ${this.options.docId}`);
  }
}
