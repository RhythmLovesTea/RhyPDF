import { create } from 'zustand';

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  zoom: number;
  currentPage: number;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setZoom: (zoom: number) => void;
  setCurrentPage: (page: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  sidebarOpen: true,
  zoom: 100,
  currentPage: 1,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 25), 800) }),
  setCurrentPage: (currentPage) => set({ currentPage })
}));
