import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addRecentFile,
  getRecentFiles,
  renameRecentFile,
  deleteRecentFile,
  downloadRecentFile,
  clearAllRecentFiles
} from '../../src/lib/recentFiles';
import { saveWorkingCopy, hasWorkingCopy, clearAllWorkingCopies } from '../../src/lib/workingCopy';

describe('Task 4.4: Recent file actions: remove, rename, delete, download again', () => {
  beforeEach(async () => {
    await clearAllRecentFiles();
    await clearAllWorkingCopies();
  });

  it('renames a recent file and enforces .pdf extension', async () => {
    await addRecentFile({
      id: 'doc-rename-test',
      name: 'initial.pdf',
      lastOpened: 1000,
      pageCount: 1
    });

    await renameRecentFile('doc-rename-test', 'Renamed Document');
    const recents = await getRecentFiles();
    const updated = recents.find((r) => r.id === 'doc-rename-test');
    expect(updated?.name).toBe('Renamed Document.pdf');
  });

  it('deletes a recent file and purges its working copy bytes', async () => {
    const docId = 'doc-del-test';
    await saveWorkingCopy(docId, new Uint8Array([1, 2, 3]));
    await addRecentFile({
      id: docId,
      name: 'delete-me.pdf',
      lastOpened: 1000,
      pageCount: 1
    });

    expect(await hasWorkingCopy(docId)).toBe(true);
    expect((await getRecentFiles()).length).toBe(1);

    await deleteRecentFile(docId);

    // Both recent record and working copy should be deleted
    expect((await getRecentFiles()).length).toBe(0);
    expect(await hasWorkingCopy(docId)).toBe(false);
  });

  it('downloads recent file bytes via object URL and link click', async () => {
    const docId = 'doc-download-test';
    await saveWorkingCopy(docId, new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    await addRecentFile({
      id: docId,
      name: 'download-me.pdf',
      lastOpened: 1000,
      pageCount: 1
    });

    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-download');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    let clicked = false;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = () => {
          clicked = true;
        };
      }
      return el;
    });

    const success = await downloadRecentFile(docId, 'download-me.pdf');
    expect(success).toBe(true);
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clicked).toBe(true);
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  it('returns false when attempting to download non-existent working copy', async () => {
    const success = await downloadRecentFile('non-existent-doc');
    expect(success).toBe(false);
  });
});
