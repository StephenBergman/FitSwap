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


// Warm raspberry primary (tint) + fresh teal accent.
// Soft blush background in light; deep slate in dark.
export const lightColors = {
  bg: '#FFF7FA',       // soft blush
  card: '#FFFFFF',
  text: '#1F2937',     // slate-800
  muted: '#6B7280',    // slate-500
  border: '#E9D8E8',   // subtle lilac
  tint: '#D74B76',     // raspberry primary
  accent: '#2FB7A3',   // teal accent
};

export const darkColors = {
  bg: '#0F1115',
  card: '#151821',
  text: '#E5E7EB',
  muted: '#9CA3AF',
  border: '#2A2F3A',
  tint: '#E06A93',     // raspberry (dark)
  accent: '#43C6B2',   // teal (dark)
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
