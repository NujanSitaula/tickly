import { Locale } from './request';
export type { Locale };

export const locales: Locale[] = ['en', 'ne', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'ru', 'ar', 'hi'];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ne: 'नेपाली',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文',
  pt: 'Português',
  ru: 'Русский',
  ar: 'العربية',
  hi: 'हिन्दी',
};
