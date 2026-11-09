import { create } from 'zustand';
import { LocaleCode, changeLocale, getPersistedLocale } from '@rhypdf/i18n';

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  locale: LocaleCode;
  sidebarOpen: boolean;
  zoom: number;
  currentPage: number;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLocale: (locale: LocaleCode) => void;
  toggleSidebar: () => void;
  setZoom: (zoom: number) => void;
  setCurrentPage: (page: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  locale: (getPersistedLocale() as LocaleCode) || 'en',
  sidebarOpen: true,
  zoom: 100,
  currentPage: 1,
  setTheme: (theme) => set({ theme }),
  setLocale: (locale) => {
    void changeLocale(locale);
    set({ locale });
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 25), 800) }),
  setCurrentPage: (currentPage) => set({ currentPage })
}));
