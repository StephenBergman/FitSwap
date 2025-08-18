// lib/theme.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';

type Scheme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  scheme: Scheme;                             // user choice
  resolvedScheme: Exclude<ColorSchemeName, null>; // actual active scheme
  setScheme: (s: Scheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme() ?? 'light';
  const [scheme, setSchemeState] = useState<Scheme>('system');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('theme.scheme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setSchemeState(saved);
      }
    })();
  }, []);

  const setScheme = (s: Scheme) => {
    setSchemeState(s);
    AsyncStorage.setItem('theme.scheme', s).catch(() => {});
  };

  const resolvedScheme = scheme === 'system' ? system : scheme;

  const value = useMemo(
    () => ({ scheme, resolvedScheme, setScheme }),
    [scheme, resolvedScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** App colors (keep this tiny) */
export const lightColors = {
  bg: '#ffffff',
  card: '#ffffff',
  text: '#0b1220',
  muted: '#6b7280',
  border: '#e5e7eb',
  tint: '#0ea5e9',
};
export const darkColors = {
  bg: '#0b1220',
  card: '#111827',
  text: '#e5e7eb',
  muted: '#9ca3af',
  border: '#1f2937',
  tint: '#38bdf8',
};

export function useColors() {
  const { resolvedScheme } = useTheme();
  return resolvedScheme === 'dark' ? darkColors : lightColors;
}

/** Convenience booleans/actions for Settings page */
export function useThemeMode() {
  const { scheme, resolvedScheme, setScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';
  const toggleDark = () => setScheme(isDark ? 'light' : 'dark');
  return {
    scheme,
    resolvedScheme,
    isDark,
    setMode: setScheme,
    toggleDark,
  };
}
