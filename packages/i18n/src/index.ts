/**
 * @rhypdf/i18n
 * i18next configuration, dictionaries, pseudo-localization, and RTL helpers.
 */

export * from './i18n';
export * from './pseudolocale';
export * from './locales/en';
export * from './locales/ar';

// Re-export common react-i18next hooks and components
export { useTranslation, Trans, I18nextProvider } from 'react-i18next';
