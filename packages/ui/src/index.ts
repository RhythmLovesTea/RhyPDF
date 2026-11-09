/**
 * @rhypdf/ui
 * Design system tokens, theme definitions, and UI constants.
 */

export const THEME_TOKENS = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  radius: {
    sm: '0.25rem', // 4px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    full: '9999px'
  },
  typography: {
    fontFamilySans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilyMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    typeScale: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    }
  },
  colors: {
    light: {
      background: '#ffffff',
      foreground: '#0f172a',
      card: '#f8fafc',
      cardForeground: '#0f172a',
      primary: '#2563eb',
      primaryForeground: '#ffffff',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      border: '#e2e8f0',
      destructive: '#ef4444'
    },
    dark: {
      background: '#0f172a',
      foreground: '#f8fafc',
      card: '#1e293b',
      cardForeground: '#f8fafc',
      primary: '#3b82f6',
      primaryForeground: '#ffffff',
      muted: '#334155',
      mutedForeground: '#94a3b8',
      border: '#334155',
      destructive: '#f87171'
    }
  }
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';
