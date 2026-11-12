import { describe, it, expect, beforeEach } from 'vitest';
import {
  initI18n,
  changeLocale,
  getScriptDirection,
  SUPPORTED_LOCALES,
  type LocaleCode
} from '../src/index';
import { enTranslations } from '../src/locales/en';
import { arTranslations } from '../src/locales/ar';
import { esTranslations } from '../src/locales/es';
import { frTranslations } from '../src/locales/fr';
import { deTranslations } from '../src/locales/de';
import { zhTranslations } from '../src/locales/zh';
import { jaTranslations } from '../src/locales/ja';
import { hiTranslations } from '../src/locales/hi';
import { ptTranslations } from '../src/locales/pt';
import { ruTranslations } from '../src/locales/ru';

describe('Phase 18.5 Localization Verification', () => {
  beforeEach(() => {
    initI18n('en');
  });

  const allLocales: LocaleCode[] = [
    'en',
    'ar',
    'es',
    'fr',
    'de',
    'zh',
    'ja',
    'hi',
    'pt',
    'ru',
    'qps-ploc'
  ];

  it('supports all top 10 global languages + pseudo-locale', () => {
    for (const code of allLocales) {
      expect(SUPPORTED_LOCALES[code]).toBeDefined();
      expect(SUPPORTED_LOCALES[code].code).toBe(code);
      expect(SUPPORTED_LOCALES[code].label).toBeTruthy();
    }
  });

  it('correctly sets script directions: RTL for Arabic & pseudo-locale, LTR for others', () => {
    expect(getScriptDirection('ar')).toBe('rtl');
    expect(getScriptDirection('qps-ploc')).toBe('rtl');
    expect(getScriptDirection('en')).toBe('ltr');
    expect(getScriptDirection('es')).toBe('ltr');
    expect(getScriptDirection('fr')).toBe('ltr');
    expect(getScriptDirection('de')).toBe('ltr');
    expect(getScriptDirection('zh')).toBe('ltr');
    expect(getScriptDirection('ja')).toBe('ltr');
    expect(getScriptDirection('hi')).toBe('ltr');
    expect(getScriptDirection('pt')).toBe('ltr');
    expect(getScriptDirection('ru')).toBe('ltr');
  });

  it('mirrors documentElement attributes upon locale change for RTL and LTR', async () => {
    await changeLocale('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');

    await changeLocale('es');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('es');

    await changeLocale('zh');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('zh');

    await changeLocale('qps-ploc');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('qps-ploc');

    await changeLocale('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  function getDeepKeyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
    let keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys = keys.concat(getDeepKeyPaths(v as Record<string, unknown>, fullPath));
      } else {
        keys.push(fullPath);
      }
    }
    return keys;
  }

  const enKeys = getDeepKeyPaths(enTranslations as Record<string, unknown>).sort();

  it('verifies that all locale files have 100% key completeness matching enTranslations', () => {
    const localeObjects = {
      ar: arTranslations,
      es: esTranslations,
      fr: frTranslations,
      de: deTranslations,
      zh: zhTranslations,
      ja: jaTranslations,
      hi: hiTranslations,
      pt: ptTranslations,
      ru: ruTranslations
    };

    for (const [lang, translations] of Object.entries(localeObjects)) {
      const langKeys = getDeepKeyPaths(translations as Record<string, unknown>).sort();
      expect(langKeys, `Locale ${lang} must match English key count`).toEqual(enKeys);
    }
  });

  it('switches locales dynamically and translates sample phrases', async () => {
    const i18n = initI18n('en');
    expect(i18n.t('nav.home')).toBe('Home');

    await changeLocale('es');
    expect(i18n.t('nav.home')).toBe('Inicio');

    await changeLocale('fr');
    expect(i18n.t('nav.home')).toBe('Accueil');

    await changeLocale('de');
    expect(i18n.t('nav.home')).toBe('Startseite');

    await changeLocale('zh');
    expect(i18n.t('nav.home')).toBe('主页');

    await changeLocale('ja');
    expect(i18n.t('nav.home')).toBe('ホーム');

    await changeLocale('hi');
    expect(i18n.t('nav.home')).toBe('होम');

    await changeLocale('pt');
    expect(i18n.t('nav.home')).toBe('Início');

    await changeLocale('ru');
    expect(i18n.t('nav.home')).toBe('Главная');

    await changeLocale('ar');
    expect(i18n.t('nav.home')).toBe('الرئيسية');
  });
});
