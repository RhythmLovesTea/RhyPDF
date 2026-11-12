import i18n, { i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enTranslations } from './locales/en';
import { arTranslations } from './locales/ar';
import { esTranslations } from './locales/es';
import { frTranslations } from './locales/fr';
import { deTranslations } from './locales/de';
import { zhTranslations } from './locales/zh';
import { jaTranslations } from './locales/ja';
import { hiTranslations } from './locales/hi';
import { ptTranslations } from './locales/pt';
import { ruTranslations } from './locales/ru';
import { generatePseudoLocale } from './pseudolocale';

export type LocaleCode =
  'en' | 'qps-ploc' | 'ar' | 'es' | 'fr' | 'de' | 'hi' | 'ja' | 'zh' | 'pt' | 'ru';

export interface LocaleMeta {
  code: LocaleCode;
  label: string;
  dir: 'ltr' | 'rtl';
  isPseudo?: boolean;
}

export const SUPPORTED_LOCALES: Record<LocaleCode, LocaleMeta> = {
  en: { code: 'en', label: 'English', dir: 'ltr' },
  'qps-ploc': {
    code: 'qps-ploc',
    label: '[!!! QPS-PLOC (Pseudo / RTL / Elongated) !!!]',
    dir: 'rtl',
    isPseudo: true
  },
  ar: { code: 'ar', label: 'العربية (Arabic)', dir: 'rtl' },
  es: { code: 'es', label: 'Español (Spanish)', dir: 'ltr' },
  fr: { code: 'fr', label: 'Français (French)', dir: 'ltr' },
  de: { code: 'de', label: 'Deutsch (German)', dir: 'ltr' },
  zh: { code: 'zh', label: '中文 (Chinese)', dir: 'ltr' },
  ja: { code: 'ja', label: '日本語 (Japanese)', dir: 'ltr' },
  hi: { code: 'hi', label: 'हिन्दी (Hindi)', dir: 'ltr' },
  pt: { code: 'pt', label: 'Português (Portuguese)', dir: 'ltr' },
  ru: { code: 'ru', label: 'Русский (Russian)', dir: 'ltr' }
};

export function getScriptDirection(locale: string): 'ltr' | 'rtl' {
  if (locale === 'qps-ploc') return 'rtl';
  if (
    locale.startsWith('ar') ||
    locale.startsWith('he') ||
    locale.startsWith('fa') ||
    locale.startsWith('ur')
  ) {
    return 'rtl';
  }
  return 'ltr';
}

export function applyDocumentDirection(locale: string): 'ltr' | 'rtl' {
  const dir = getScriptDirection(locale);
  if (typeof document !== 'undefined') {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }
  return dir;
}

const LOCALE_STORAGE_KEY = 'rhypdf_locale';

export function getPersistedLocale(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved && saved in SUPPORTED_LOCALES) {
        return saved;
      }
    } catch {
      // localStorage may fail in restricted sandboxes
    }
  }
  return 'en';
}

export function persistLocale(locale: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }
}

let isInitialized = false;

export function initI18n(initialLng?: string): I18nInstance {
  if (isInitialized) {
    return i18n;
  }

  const defaultLng = initialLng || getPersistedLocale();

  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: enTranslations },
        'qps-ploc': { translation: generatePseudoLocale(enTranslations) },
        ar: { translation: arTranslations },
        es: { translation: esTranslations },
        fr: { translation: frTranslations },
        de: { translation: deTranslations },
        zh: { translation: zhTranslations },
        ja: { translation: jaTranslations },
        hi: { translation: hiTranslations },
        pt: { translation: ptTranslations },
        ru: { translation: ruTranslations }
      },
      supportedLngs: Object.keys(SUPPORTED_LOCALES),
      load: 'currentOnly',
      lowerCaseLng: true,
      cleanCode: false,
      lng: defaultLng,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false // React already escapes values
      }
    })
    .catch((err) => {
      console.error('Failed to initialize i18n:', err);
    });

  // Apply direction for the initial language
  applyDocumentDirection(defaultLng);

  // Keep HTML attributes in sync with language switches
  i18n.on('languageChanged', (lng: string) => {
    applyDocumentDirection(lng);
    persistLocale(lng);
  });

  isInitialized = true;
  return i18n;
}

export async function changeLocale(locale: LocaleCode): Promise<void> {
  if (!isInitialized) {
    initI18n(locale);
  }
  await i18n.changeLanguage(locale);
  applyDocumentDirection(locale);
  persistLocale(locale);
}

export { i18n };
