import { create } from 'zustand';

export type EditorMode = 'view' | 'edit-text' | 'edit-images' | 'annotate' | 'pages';

export interface DocState {
  currentDocId: string | null;
  filename: string | null;
  fileHandle: FileSystemFileHandle | null;
  pageCount: number;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  storageType: 'opfs' | 'idb' | 'memory' | null;
  activeMode: EditorMode;

  setDoc: (
    id: string,
    filename: string,
    pageCount: number,
    handle?: FileSystemFileHandle | null,
    storageType?: 'opfs' | 'idb' | 'memory'
  ) => void;
  renameDoc: (newName: string) => void;
  setPageCount: (count: number) => void;
  setDirty: (isDirty: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setLastSavedAt: (timestamp: number) => void;
  setActiveMode: (mode: EditorMode) => void;
  closeDoc: () => void;
}

export const useDocStore = create<DocState>((set) => ({
  currentDocId: null,
  filename: null,
  fileHandle: null,
  pageCount: 0,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  storageType: null,
  activeMode: 'view',

  setDoc: (currentDocId, filename, pageCount, fileHandle = null, storageType = 'opfs') =>
    set({
      currentDocId,
      filename,
      pageCount,
      fileHandle,
      storageType,
      isDirty: false,
      isSaving: false,
      lastSavedAt: Date.now()
    }),

  renameDoc: (filename) => set({ filename, isDirty: true }),
  setPageCount: (pageCount) => set({ pageCount, isDirty: true }),
  setDirty: (isDirty) => set({ isDirty }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt, isDirty: false }),
  setActiveMode: (activeMode) => set({ activeMode }),

  closeDoc: () =>
    set({
      currentDocId: null,
      filename: null,
      fileHandle: null,
      pageCount: 0,
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      storageType: null,
      activeMode: 'view'
    })
}));
