import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveWorkingCopy,
  loadWorkingCopy,
  hasWorkingCopy,
  deleteWorkingCopy,
  clearAllWorkingCopies
} from '../../src/lib/workingCopy';

describe('Task 4.6: Working-copy system: copy bytes on open, OPFS / IndexedDB fallback, original untouched', () => {
  beforeEach(async () => {
    await clearAllWorkingCopies();
  });

  it('saves and loads working copy bytes', async () => {
    const docId = 'doc-test-wc-1';
    const originalBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

    const saveResult = await saveWorkingCopy(docId, originalBytes);
    expect(saveResult.docId).toBe(docId);
    expect(['opfs', 'idb', 'memory']).toContain(saveResult.storageType);

    const loaded = await loadWorkingCopy(docId);
    expect(loaded).not.toBeNull();
    const loadedU8 = new Uint8Array(loaded!);
    expect(Array.from(loadedU8)).toEqual(Array.from(originalBytes));
  });

  it('detects existence of working copy with hasWorkingCopy', async () => {
    const docId = 'doc-test-wc-exists';
    expect(await hasWorkingCopy(docId)).toBe(false);

    await saveWorkingCopy(docId, new Uint8Array([1, 2, 3]));
    expect(await hasWorkingCopy(docId)).toBe(true);

    await deleteWorkingCopy(docId);
    expect(await hasWorkingCopy(docId)).toBe(false);
  });

  it('handles Blob inputs when creating working copies', async () => {
    const docId = 'doc-test-wc-blob';
    const blob = new Blob(['%PDF-test-blob'], { type: 'application/pdf' });

    await saveWorkingCopy(docId, blob);
    const loaded = await loadWorkingCopy(docId);
    expect(loaded).not.toBeNull();

    const text = new TextDecoder().decode(loaded!);
    expect(text).toBe('%PDF-test-blob');
  });

  it('leaves original bytes untouched when mutating working copy', async () => {
    const docId = 'doc-test-isolation';
    const originalBytes = new Uint8Array([10, 20, 30, 40]);
    const originalCopy = new Uint8Array(originalBytes);

    await saveWorkingCopy(docId, originalBytes);

    // Update working copy with new data
    const mutatedBytes = new Uint8Array([99, 99, 99, 99]);
    await saveWorkingCopy(docId, mutatedBytes);

    const loaded = await loadWorkingCopy(docId);
    expect(Array.from(new Uint8Array(loaded!))).toEqual([99, 99, 99, 99]);

    // Original buffer in caller's memory remains untouched
    expect(Array.from(originalBytes)).toEqual(Array.from(originalCopy));
  });

  it('clears all working copies on clearAllWorkingCopies', async () => {
    await saveWorkingCopy('doc-1', new Uint8Array([1]));
    await saveWorkingCopy('doc-2', new Uint8Array([2]));

    expect(await hasWorkingCopy('doc-1')).toBe(true);
    expect(await hasWorkingCopy('doc-2')).toBe(true);

    await clearAllWorkingCopies();

    expect(await hasWorkingCopy('doc-1')).toBe(false);
    expect(await hasWorkingCopy('doc-2')).toBe(false);
  });
});
