import { create } from 'zustand';

export interface DocState {
  currentDocId: string | null;
  filename: string | null;
  pageCount: number;
  isDirty: boolean;
  isSaving: boolean;
  setDoc: (id: string, filename: string, pageCount: number) => void;
  setDirty: (isDirty: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  closeDoc: () => void;
}

export const useDocStore = create<DocState>((set) => ({
  currentDocId: null,
  filename: null,
  pageCount: 0,
  isDirty: false,
  isSaving: false,
  setDoc: (currentDocId, filename, pageCount) =>
    set({ currentDocId, filename, pageCount, isDirty: false, isSaving: false }),
  setDirty: (isDirty) => set({ isDirty }),
  setSaving: (isSaving) => set({ isSaving }),
  closeDoc: () =>
    set({ currentDocId: null, filename: null, pageCount: 0, isDirty: false, isSaving: false })
}));
