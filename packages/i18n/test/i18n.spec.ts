import { describe, it, expect, beforeEach } from 'vitest';
import {
  initI18n,
  changeLocale,
  getScriptDirection,
  applyDocumentDirection,
  pseudolocalizeString,
  generatePseudoLocale,
  SUPPORTED_LOCALES
} from '../src/index';
import { enTranslations } from '../src/locales/en';

describe('@rhypdf/i18n', () => {
  beforeEach(() => {
    initI18n('en');
  });

  it('provides supported locales metadata with correct directions', () => {
    expect(SUPPORTED_LOCALES.en.dir).toBe('ltr');
    expect(SUPPORTED_LOCALES['qps-ploc'].dir).toBe('rtl');
    expect(SUPPORTED_LOCALES['qps-ploc'].isPseudo).toBe(true);
    expect(SUPPORTED_LOCALES.ar.dir).toBe('rtl');
  });

  it('determines script direction accurately', () => {
    expect(getScriptDirection('en')).toBe('ltr');
    expect(getScriptDirection('es')).toBe('ltr');
    expect(getScriptDirection('qps-ploc')).toBe('rtl');
    expect(getScriptDirection('ar')).toBe('rtl');
    expect(getScriptDirection('he')).toBe('rtl');
  });

  it('applies direction and lang to documentElement in browser environments', () => {
    applyDocumentDirection('qps-ploc');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('qps-ploc');

    applyDocumentDirection('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('pseudolocalizes strings with accents, elongation, brackets and preserves interpolation tokens', () => {
    const raw = 'Page {{page}} count';
    const pseudo = pseudolocalizeString(raw);

    expect(pseudo.startsWith('[!!! ')).toBe(true);
    expect(pseudo.endsWith(' !!!]')).toBe(true);
    // Interpolation must be preserved exactly
    expect(pseudo).toContain('{{page}}');
    // Must be elongated compared to input
    expect(pseudo.length).toBeGreaterThan(raw.length);
  });

  it('deep pseudolocalizes nested translation objects', () => {
    const mock = {
      greeting: 'Hello World',
      nested: {
        action: 'Click here'
      }
    };
    const res = generatePseudoLocale(mock);
    expect(res.greeting.startsWith('[!!! ')).toBe(true);
    expect(res.nested.action.startsWith('[!!! ')).toBe(true);
  });

  it('switches languages dynamically and renders translated keys', async () => {
    const i18nInstance = initI18n('en');
    await changeLocale('en');
    expect(i18nInstance.t('app.title')).toBe('RhyPDF');
    expect(i18nInstance.t('editor.sidebar.page', { page: 5 })).toBe('Page 5');

    // Switch to pseudo-locale
    await changeLocale('qps-ploc');
    const pseudoTitle = i18nInstance.t('app.title');
    expect(pseudoTitle.startsWith('[!!! ')).toBe(true);
    expect(pseudoTitle.endsWith(' !!!]')).toBe(true);
    expect(document.documentElement.dir).toBe('rtl');

    // Interpolation check in pseudo-locale
    const pseudoPage = i18nInstance.t('editor.sidebar.page', { page: 5 });
    expect(pseudoPage).toContain('5');

    // Switch to Arabic
    await changeLocale('ar');
    expect(i18nInstance.t('app.title')).toBe('راي بي دي إف');
    expect(document.documentElement.dir).toBe('rtl');

    // Switch back to English
    await changeLocale('en');
    expect(i18nInstance.t('app.title')).toBe('RhyPDF');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('ensures all top-level sections in enTranslations are non-empty', () => {
    expect(Object.keys(enTranslations).length).toBeGreaterThan(5);
    expect(enTranslations.app.title).toBe('RhyPDF');
    expect(enTranslations.nav.home).toBe('Home');
    expect(enTranslations.home.title).toBe('RhyPDF Workspace');
    expect(enTranslations.editor.title).toBe('RhyPDF Editor');
    expect(enTranslations.pages.title).toBe('Page Organizer');
    expect(enTranslations.settings.title).toBe('Application Settings');
  });
});
