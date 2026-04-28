// Source file for ThemeContext.

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleTheme: () => {},
  isDark: false,
});

// Provides theme mode.
export const useThemeMode = () => useContext(ThemeContext);

// Returns stored mode.
const getStoredMode = (): ThemeMode => {
  try {
    const stored = localStorage.getItem('themeMode');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

// Handles theme context provider.
export const ThemeContextProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);

// Runs side effects for this component.
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode]);

// Memoizes the toggle theme callback.
  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('themeMode', next);
      } catch {}
      return next;
    });
  }, []);

// Memoizes the value derived value.
  const value = useMemo(
    () => ({
      mode,
      toggleTheme,
      isDark: mode === 'dark',
    }),
    [mode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
