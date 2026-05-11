import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ThemeMode } from '../../shared/types';
import { api } from './api';

export const THEME_KEY = 'agentflow.theme';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_KEY);
  return isThemeMode(stored) ? stored : 'system';
}

export function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.classList.remove('light');
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = theme;
}

export function setStoredTheme(theme: ThemeMode): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_KEY, theme);
  }
  applyTheme(theme);
}

export function onSystemThemeChange(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const userChangedRef = useRef(false);
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const legacyTheme = window.localStorage.getItem('agentflow-theme');
      if (!window.localStorage.getItem(THEME_KEY) && isThemeMode(legacyTheme)) {
        window.localStorage.setItem(THEME_KEY, legacyTheme);
      }
    }
    return getTheme();
  });
  const [readyToPersist, setReadyToPersist] = useState(() => (
    typeof window === 'undefined' || isThemeMode(window.localStorage.getItem(THEME_KEY))
  ));

  useEffect(() => {
    let cancelled = false;
    if (typeof window === 'undefined' || isThemeMode(window.localStorage.getItem(THEME_KEY))) {
      setReadyToPersist(true);
      return undefined;
    }
    void api.settings.get('theme')
      .then((stored) => {
        if (!cancelled && !userChangedRef.current && isThemeMode(stored)) setThemeState(stored);
      })
      .finally(() => {
        if (!cancelled && !userChangedRef.current) setReadyToPersist(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (readyToPersist) {
      setStoredTheme(theme);
      void api.settings.set('theme', theme).catch(() => undefined);
      return;
    }
    applyTheme(theme);
  }, [readyToPersist, theme]);

  useEffect(() => {
    if (theme !== 'system') return undefined;
    return onSystemThemeChange(() => applyTheme(theme));
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    userChangedRef.current = true;
    setReadyToPersist(true);
    setThemeState(nextTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [setTheme, theme]);

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useThemePreference(): ThemeContextValue {
  const value = React.useContext(ThemeContext);
  if (value) return value;
  return {
    theme: getTheme(),
    setTheme: setStoredTheme,
  };
}
