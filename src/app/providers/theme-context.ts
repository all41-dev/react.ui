import { createContext, useContext } from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "rui-theme";

/** The OPS sandbox boots dark; the library itself defaults to light. */
export const DEFAULT_THEME: Theme = "dark";

export type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
