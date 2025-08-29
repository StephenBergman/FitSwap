// lib/theme.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';

type Scheme = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  scheme: Scheme;                               // user choice
  resolvedScheme: Exclude<ColorSchemeName, null>; // active scheme in effect
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

/* ------------------------------------------------------------------ */
/* Colors (drop-in palette)
   Inspired by https://www.realtimecolors.com/?colors=e5ddee-0f0b15-bdaad4-663451-ac5b71
   Goals:
   - High contrast text on bg in both modes
   - Consistent primary ("tint") across modes for brand
   - Gentle neutrals for cards/borders; readable "muted"
   - Keep existing keys so the rest of the app works unchanged
/* ------------------------------------------------------------------ */

export const lightColors = {
  bg:     '#F6F3FA', // soft lavender paper
  card:   '#FFFFFF',
  text:   '#0F0B15', // near-black ink
  muted:  '#6E647D', // subdued copy / placeholders
  border: '#E5E0EC', // subtle hairline
  tint:   '#663451', // primary actions (white text on this)
  accent: '#AC5B71', // secondary emphasis (links/badges)

  // Status (kept close to your original semantics)
  success: '#15803D',
  warning: '#B45309',
  danger:  '#B91C1C',

  overlay: 'rgba(0,0,0,0.12)', // shadows/scrims on light
};

export const darkColors = {
  bg:     '#0F0B15', // deep eggplant
  card:   '#16111F', // lifted surface
  text:   '#E5DDEE', // lavender ink
  muted:  '#BFB6CB', // desaturated copy
  border: '#2B2236',
  tint:   '#663451', // same brand primary
  accent: '#BDAAD4', // gentle lavender accent

  success: '#0F4D2E',
  warning: '#F59E0B',
  danger:  '#EF4444',

  overlay: 'rgba(0,0,0,0.45)', // deeper scrim for dark
};

export const tokens = {
  successBase:    '#15803D',  
  // warningBase: '#B45309',
  // dangerBase:  '#B91C1C',
};


export const radius  = { sm: 8, md: 12, lg: 16, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
export const type = {
  titleXL: { size: 28, lineHeight: 34, weight: '700' as const },
  title:   { size: 22, lineHeight: 28, weight: '700' as const },
  body:    { size: 16, lineHeight: 24, weight: '400' as const },
  label:   { size: 14, lineHeight: 20, weight: '600' as const },
  cap:     { size: 12, lineHeight: 16, weight: '500' as const },
};

export function useColors() {
  const { resolvedScheme } = useTheme();
  return resolvedScheme === 'dark' ? darkColors : lightColors;
}

/** Convenience for Settings page */
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
