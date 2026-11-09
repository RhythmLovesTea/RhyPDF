/**
 * @rhypdf/i18n
 * Supported locales, direction detection, and translation models.
 */

export type LocaleCode = 'en' | 'ar' | 'es' | 'fr' | 'de' | 'hi' | 'ja' | 'zh';

export interface LocaleMeta {
  code: LocaleCode;
  label: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LOCALES: Record<LocaleCode, LocaleMeta> = {
  en: { code: 'en', label: 'English', dir: 'ltr' },
  ar: { code: 'ar', label: 'العربية', dir: 'rtl' },
  es: { code: 'es', label: 'Español', dir: 'ltr' },
  fr: { code: 'fr', label: 'Français', dir: 'ltr' },
  de: { code: 'de', label: 'Deutsch', dir: 'ltr' },
  hi: { code: 'hi', label: 'हिन्दी', dir: 'ltr' },
  ja: { code: 'ja', label: '日本語', dir: 'ltr' },
  zh: { code: 'zh', label: '中文', dir: 'ltr' }
};

export function getScriptDirection(locale: string): 'ltr' | 'rtl' {
  const code = locale.split('-')[0] as LocaleCode;
  return SUPPORTED_LOCALES[code]?.dir ?? 'ltr';
}
