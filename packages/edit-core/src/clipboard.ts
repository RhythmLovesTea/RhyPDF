import type { PageObject, TextRun } from '@rhypdf/pdf-model';
import { cloneObject } from './commands';

export interface ClipboardData {
  objects: PageObject[];
  sourcePageIndex: number;
  sourceDocumentId?: string;
  copiedAt: number;
}

export class ClipboardManager {
  private static instance: ClipboardManager;
  private clipboardData: ClipboardData | null = null;

  static getInstance(): ClipboardManager {
    if (!ClipboardManager.instance) {
      ClipboardManager.instance = new ClipboardManager();
    }
    return ClipboardManager.instance;
  }

  get hasData(): boolean {
    return this.clipboardData !== null && this.clipboardData.objects.length > 0;
  }

  /**
   * Copies objects to the internal clipboard and writes text to system clipboard if applicable.
   */
  async copy(
    objects: PageObject[],
    sourcePageIndex: number,
    sourceDocumentId?: string
  ): Promise<void> {
    if (objects.length === 0) return;

    this.clipboardData = {
      objects: objects.map(cloneObject),
      sourcePageIndex,
      sourceDocumentId,
      copiedAt: Date.now()
    };

    // System clipboard text bridge
    const textObjects = objects.filter((o): o is TextRun => o.type === 'text');
    if (
      textObjects.length > 0 &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard?.writeText
    ) {
      try {
        const fullText = textObjects.map((t) => t.text).join('\n');
        await navigator.clipboard.writeText(fullText);
      } catch {
        // Ignore clipboard permission errors silently
      }
    }
  }

  /**
   * Retrieves objects for pasting, generating fresh IDs and applying an offset in PDF points.
   */
  paste(targetPageIndex: number, offsetPt = { dx: 20, dy: -20 }): PageObject[] {
    if (!this.clipboardData || this.clipboardData.objects.length === 0) {
      return [];
    }

    const isSamePage = this.clipboardData.sourcePageIndex === targetPageIndex;
    const dx = isSamePage ? offsetPt.dx : 0;
    const dy = isSamePage ? offsetPt.dy : 0;

    return this.clipboardData.objects.map((orig) => {
      const cloned = cloneObject(orig);
      cloned.id = `${cloned.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (cloned.bounds && (dx !== 0 || dy !== 0)) {
        cloned.bounds = {
          left: cloned.bounds.left + dx,
          right: cloned.bounds.right + dx,
          bottom: cloned.bounds.bottom + dy,
          top: cloned.bounds.top + dy
        };
      }
      return cloned;
    });
  }

  /**
   * Duplicates objects in-place with a +20pt offset.
   */
  duplicate(objects: PageObject[], offsetPt = { dx: 20, dy: -20 }): PageObject[] {
    return objects.map((orig) => {
      const cloned = cloneObject(orig);
      cloned.id = `${cloned.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (cloned.bounds) {
        cloned.bounds = {
          left: cloned.bounds.left + offsetPt.dx,
          right: cloned.bounds.right + offsetPt.dx,
          bottom: cloned.bounds.bottom + offsetPt.dy,
          top: cloned.bounds.top + offsetPt.dy
        };
      }
      return cloned;
    });
  }

  clear(): void {
    this.clipboardData = null;
  }
}
