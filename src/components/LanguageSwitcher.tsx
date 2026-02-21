'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Globe } from 'lucide-react';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

type LanguageSwitcherProps = {
  /**
   * Where the dropdown should appear relative to the button.
   * - 'top': dropdown opens above the button (used in sidebar/dashboard)
   * - 'bottom': dropdown opens below the button (used on auth pages)
   */
  placement?: 'top' | 'bottom';
};

export default function LanguageSwitcher({ placement = 'top' }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  async function handleLanguageChange(newLocale: Locale) {
    // Update cookie
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Update backend if user is logged in
    if (user && token) {
      try {
        await fetch(`${API_URL}/user/language`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language: newLocale }),
        });
      } catch (error) {
        console.error('Failed to update language preference:', error);
      }
    }
    
    setIsOpen(false);
    router.refresh();
    window.location.reload(); // Reload to apply new locale
  }

  const menuPositionClass =
    placement === 'bottom'
      ? 'absolute top-full right-0 mt-2'
      : 'absolute bottom-full right-0 mb-2';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <span className="sm:hidden">{locale.toUpperCase()}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className={`${menuPositionClass} z-20 w-48 rounded-lg border border-border bg-popover shadow-lg`}>
            <div className="p-1">
              {locales.map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLanguageChange(loc)}
                  className={`cursor-pointer w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    locale === loc
                      ? 'bg-accent text-accent-foreground'
                      : 'text-popover-foreground hover:bg-muted'
                  }`}
                >
                  {localeNames[loc]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
