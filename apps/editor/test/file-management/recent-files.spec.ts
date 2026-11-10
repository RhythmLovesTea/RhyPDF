import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addRecentFile,
  getRecentFiles,
  updateRecentFile,
  removeRecentFile,
  clearAllRecentFiles,
  verifyFileHandlePermission,
  RecentFileItem
} from '../../src/lib/recentFiles';

describe('Task 4.3: Recent files in IndexedDB: metadata, handles, permission check', () => {
  beforeEach(async () => {
    await clearAllRecentFiles();
  });

  it('adds and retrieves recent files sorted by lastOpened descending', async () => {
    const item1: RecentFileItem = {
      id: 'doc-1',
      name: 'doc1.pdf',
      lastOpened: 1000,
      pageCount: 3,
      size: 1024
    };

    const item2: RecentFileItem = {
      id: 'doc-2',
      name: 'doc2.pdf',
      lastOpened: 2000,
      pageCount: 10,
      size: 2048
    };

    await addRecentFile(item1);
    await addRecentFile(item2);

    const recents = await getRecentFiles();
    expect(recents.length).toBe(2);
    // doc-2 was opened more recently than doc-1
    expect(recents[0]?.id).toBe('doc-2');
    expect(recents[1]?.id).toBe('doc-1');
  });

  it('updates recent file properties (page count, last position)', async () => {
    const item: RecentFileItem = {
      id: 'doc-update',
      name: 'update.pdf',
      lastOpened: 1000,
      pageCount: 1,
      size: 500
    };

    await addRecentFile(item);
    await updateRecentFile('doc-update', {
      pageCount: 15,
      lastPosition: { page: 4, scale: 1.25, fitMode: 'fitWidth' }
    });

    const recents = await getRecentFiles();
    const found = recents.find((r) => r.id === 'doc-update');
    expect(found).toBeDefined();
    expect(found?.pageCount).toBe(15);
    expect(found?.lastPosition?.page).toBe(4);
    expect(found?.lastPosition?.scale).toBe(1.25);
  });

  it('removes a recent file with removeRecentFile', async () => {
    await addRecentFile({
      id: 'doc-remove',
      name: 'remove.pdf',
      lastOpened: 500,
      pageCount: 1
    });

    expect((await getRecentFiles()).length).toBe(1);
    await removeRecentFile('doc-remove');
    expect((await getRecentFiles()).length).toBe(0);
  });

  it('verifies permission when handle already has permission', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('granted')
    } as unknown as FileSystemFileHandle;

    const result = await verifyFileHandlePermission(mockHandle);
    expect(result).toBe(true);
    expect(
      (mockHandle as unknown as { queryPermission: unknown }).queryPermission
    ).toHaveBeenCalledWith({
      mode: 'read'
    });
  });

  it('requests permission when queryPermission returns prompt', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('granted')
    } as unknown as FileSystemFileHandle;

    const result = await verifyFileHandlePermission(mockHandle);
    expect(result).toBe(true);
    expect(
      (mockHandle as unknown as { requestPermission: unknown }).requestPermission
    ).toHaveBeenCalledWith({ mode: 'read' });
  });

  it('returns false when user denies permission request', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('denied')
    } as unknown as FileSystemFileHandle;

    const result = await verifyFileHandlePermission(mockHandle);
    expect(result).toBe(false);
  });
});
