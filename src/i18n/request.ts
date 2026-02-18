import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['en', 'ne', 'es', 'fr', 'de', 'ja', 'zh', 'pt', 'ru', 'ar', 'hi'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
  // Get locale from cookie or default to 'en'
  const cookieStore = await cookies();
  let locale = (cookieStore.get('locale')?.value || 'en') as Locale;
  
  // Validate locale is supported
  if (!locales.includes(locale)) {
    locale = 'en';
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}`)).default,
  };
});
