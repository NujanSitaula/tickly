'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { userPreferences } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { applyThemeToDOM, type ThemeMode, type ColorScheme } from '@/components/ThemeLoader';

type ThemeContextValue = {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('blue');

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    applyThemeToDOM(newTheme, colorScheme);

    if (token) {
      try {
        await userPreferences.set('theme', newTheme);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  }, [token, colorScheme]);

  const setColorScheme = useCallback(async (newScheme: ColorScheme) => {
    setColorSchemeState(newScheme);
    applyThemeToDOM(theme, newScheme);

    if (token) {
      try {
        await userPreferences.set('color_scheme', newScheme);
      } catch (error) {
        console.error('Failed to save color scheme preference:', error);
      }
    }
  }, [token, theme]);

  useEffect(() => {
    const storedTheme = (localStorage.getItem('tickly_theme') as ThemeMode) || 'light';
    const storedScheme = (localStorage.getItem('tickly_color_scheme') as ColorScheme) || 'blue';
    setThemeState(storedTheme);
    setColorSchemeState(storedScheme);

    if (!token) return;

    async function load() {
      try {
        const [themeRes, schemeRes] = await Promise.all([
          userPreferences.get('theme'),
          userPreferences.get('color_scheme'),
        ]);
        const t = (themeRes?.data?.value as ThemeMode) || 'light';
        const s = (schemeRes?.data?.value as ColorScheme) || 'blue';
        setThemeState(t);
        setColorSchemeState(s);
        applyThemeToDOM(t, s);
      } catch {
        // Keep localStorage values
      }
    }

    load();
  }, [token]);

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, setTheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
