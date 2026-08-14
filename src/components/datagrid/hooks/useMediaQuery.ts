import { useCallback, useMemo, useSyncExternalStore } from "react";

/** Mirrors Tailwind's `md` breakpoint (48rem) — below it the grid is "mobile". */
export const BELOW_MD = "(max-width: 47.99rem)";

/**
 * Whether a CSS media query currently matches, re-rendering when it flips.
 *
 * Reads `false` wherever `matchMedia` is unavailable (server render, jsdom), so a
 * layout driven by this starts from the wide variant rather than throwing.
 */
export function useMediaQuery(query: string): boolean {
  // One list per query. `getSnapshot` runs on every render, so building it there called
  // `matchMedia` each time for a value that only changes when `query` does.
  const mql = useMemo(
    () =>
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia(query)
        : null,
    [query]
  );

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!mql) return () => {};
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [mql]
  );

  const getSnapshot = useCallback(() => mql?.matches ?? false, [mql]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
