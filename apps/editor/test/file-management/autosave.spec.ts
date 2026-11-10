import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutosaveManager } from '../../src/lib/autosave';
import { loadWorkingCopy, clearAllWorkingCopies } from '../../src/lib/workingCopy';
import { getRecoveryMetadata, clearRecoveryMetadata } from '../../src/lib/recovery';

describe('Task 4.7: Autosave: working copy + snapshot every N seconds & visibilitychange / pagehide', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    await clearAllWorkingCopies();
    clearRecoveryMetadata();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('automatically saves working copy on timer interval when dirty', async () => {
    const docId = 'doc-autosave-timer';
    const isDirty = true;
    const testBytes = new Uint8Array([1, 2, 3, 4]);
    const onSaved = vi.fn();

    const autosave = new AutosaveManager({
      docId,
      filename: 'contract.pdf',
      intervalMs: 1000,
      isDirty: () => isDirty,
      getBytes: () => testBytes,
      onSaved
    });

    // Advance time by 1000ms
    await vi.advanceTimersByTimeAsync(1000);

    expect(onSaved).toHaveBeenCalled();
    const loaded = await loadWorkingCopy(docId);
    expect(loaded).not.toBeNull();
    expect(Array.from(new Uint8Array(loaded!))).toEqual([1, 2, 3, 4]);

    // Check recovery metadata was saved
    const meta = getRecoveryMetadata();
    expect(meta).not.toBeNull();
    expect(meta?.documentId).toBe(docId);
    expect(meta?.isDirty).toBe(true);

    autosave.destroy();
  });

  it('does not autosave on interval when document is not dirty', async () => {
    const docId = 'doc-autosave-clean';
    const onSaved = vi.fn();

    const autosave = new AutosaveManager({
      docId,
      filename: 'clean.pdf',
      intervalMs: 1000,
      isDirty: () => false,
      getBytes: () => new Uint8Array([5, 6, 7]),
      onSaved
    });

    await vi.advanceTimersByTimeAsync(2000);

    expect(onSaved).not.toHaveBeenCalled();
    expect(await loadWorkingCopy(docId)).toBeNull();

    autosave.destroy();
  });

  it('triggers autosave when visibilitychange fires and document is hidden', async () => {
    const docId = 'doc-visibility-test';
    const onSaved = vi.fn();

    const autosave = new AutosaveManager({
      docId,
      filename: 'vis.pdf',
      isDirty: () => true,
      getBytes: () => new Uint8Array([99]),
      onSaved
    });

    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true
    });

    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(50);

    expect(onSaved).toHaveBeenCalled();

    // Reset visibilityState
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    });

    autosave.destroy();
  });

  it('triggers autosave on window pagehide event', async () => {
    const docId = 'doc-pagehide-test';
    const onSaved = vi.fn();

    const autosave = new AutosaveManager({
      docId,
      filename: 'pagehide.pdf',
      isDirty: () => true,
      getBytes: () => new Uint8Array([88]),
      onSaved
    });

    window.dispatchEvent(new Event('pagehide'));
    await vi.advanceTimersByTimeAsync(50);

    expect(onSaved).toHaveBeenCalled();

    autosave.destroy();
  });
});
