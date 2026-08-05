import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_THEME,
  isTheme,
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
} from "./theme-context";

/**
 * The inline script in index.html has already resolved the theme and stamped it on
 * <html> before this bundle ran. Read it back rather than re-deriving, so React state
 * and the DOM cannot disagree on the first paint.
 */
function readStampedTheme(): Theme {
  const stamped = document.documentElement.dataset.theme;
  return isTheme(stamped) ? stamped : DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStampedTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled — the theme still applies for this session.
    }
  }, []);

  const toggle = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
