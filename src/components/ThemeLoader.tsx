'use client';

import { useEffect } from 'react';
import { userPreferences } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'blue' | 'green' | 'purple' | 'red' | 'orange';

const THEME_KEY = 'tickly_theme';
const COLOR_SCHEME_KEY = 'tickly_color_scheme';

const DEFAULT_THEME: ThemeMode = 'light';
const DEFAULT_COLOR_SCHEME: ColorScheme = 'blue';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode, colorScheme: ColorScheme) {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove('light', 'dark', 'light-theme', 'dark-theme');
  root.classList.remove('blue-theme', 'green-theme', 'purple-theme', 'red-theme', 'orange-theme');

  // Apply theme mode
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  root.classList.add(resolvedTheme, `${resolvedTheme}-theme`);

  // Apply color scheme
  root.classList.add(`${colorScheme}-theme`);
}

export function applyThemeToDOM(theme: ThemeMode, colorScheme: ColorScheme) {
  applyTheme(theme, colorScheme);
  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(COLOR_SCHEME_KEY, colorScheme);
  }
}

export default function ThemeLoader() {
  const { token } = useAuth();

  useEffect(() => {
    // Apply immediately from localStorage for instant load (avoids flash)
    const storedTheme = (localStorage.getItem(THEME_KEY) as ThemeMode) || DEFAULT_THEME;
    const storedScheme = (localStorage.getItem(COLOR_SCHEME_KEY) as ColorScheme) || DEFAULT_COLOR_SCHEME;
    applyTheme(storedTheme, storedScheme);

    if (!token) {
      return;
    }

    async function loadPreferences() {
      try {
        const [themeRes, schemeRes] = await Promise.all([
          userPreferences.get('theme'),
          userPreferences.get('color_scheme'),
        ]);

        const theme = (themeRes?.data?.value as ThemeMode) || DEFAULT_THEME;
        const colorScheme = (schemeRes?.data?.value as ColorScheme) || DEFAULT_COLOR_SCHEME;

        applyThemeToDOM(theme, colorScheme);
      } catch {
        // Keep localStorage/defaults on error
      }
    }

    loadPreferences();
  }, [token]);

  // Listen for system theme changes when theme is "system"
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as ThemeMode;
    if (storedTheme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const scheme = (localStorage.getItem(COLOR_SCHEME_KEY) as ColorScheme) || DEFAULT_COLOR_SCHEME;
      applyTheme('system', scheme);
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  return null;
}
