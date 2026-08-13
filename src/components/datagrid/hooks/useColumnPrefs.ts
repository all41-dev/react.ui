import { useCallback, useEffect, useMemo, useState } from "react";
import type { Updater, VisibilityState } from "@tanstack/react-table";

type ColumnPrefs = {
  columnSizing: Record<string, number>;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  v: number;
};

const VERSION = 1;

const DEFAULT: ColumnPrefs = {
  columnSizing: {},
  columnOrder: [],
  columnVisibility: {},
  v: VERSION,
};

function safeLoad(key: string): ColumnPrefs {
  try {
    if (typeof window === "undefined") return DEFAULT;
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ColumnPrefs> | null;
    // A stored blob from an older shape is discarded rather than merged — merging
    // half-migrated preferences produces layouts nobody chose.
    if (!parsed || parsed.v !== VERSION) return DEFAULT;
    return {
      columnSizing: parsed.columnSizing ?? {},
      columnOrder: Array.isArray(parsed.columnOrder) ? parsed.columnOrder : [],
      columnVisibility: parsed.columnVisibility ?? {},
      v: VERSION,
    };
  } catch {
    // Private mode, quota, or malformed JSON — fall back to defaults.
    return DEFAULT;
  }
}

function safeSave(key: string, prefs: ColumnPrefs) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — preferences are best-effort */
  }
}

/** Stable identity, so the visibility memo below doesn't rerun on every render. */
const NO_DEFAULT_HIDDEN: string[] = [];

/**
 * Column sizing, order and visibility, persisted per `storageKey`.
 *
 * `defaultHiddenIds` are the columns that start hidden — see `meta.visibleInTable`.
 */
export function useColumnPrefs(
  storageKey: string,
  allColumnIds: string[],
  defaultHiddenIds: string[] = NO_DEFAULT_HIDDEN
) {
  const [prefs, setPrefs] = useState<ColumnPrefs>(() => safeLoad(storageKey));

  // Switching grids (or storageKey) must load that grid's own preferences rather than
  // carrying the previous one's over. Reconciled during render, not in an effect, so the
  // first paint already uses the right layout.
  const [loadedKey, setLoadedKey] = useState(storageKey);
  if (storageKey !== loadedKey) {
    setLoadedKey(storageKey);
    setPrefs(safeLoad(storageKey));
  }

  const normalizedOrder = useMemo(() => {
    const known = new Set(allColumnIds);
    const kept = (prefs.columnOrder || []).filter((id) => known.has(id));
    const missing = allColumnIds.filter((id) => !kept.includes(id));
    return [...kept, ...missing];
  }, [prefs.columnOrder, allColumnIds]);

  /* A stored preference is layered over the defaults rather than merged into them: the
     seed is what the grid ships with, the stored value is what the user chose, and the
     user wins. Nothing about the seed is ever written to storage. */
  const columnVisibility = useMemo(() => {
    if (defaultHiddenIds.length === 0) return prefs.columnVisibility;
    const seeded: Record<string, boolean> = {};
    for (const id of defaultHiddenIds) seeded[id] = false;
    return { ...seeded, ...prefs.columnVisibility };
  }, [defaultHiddenIds, prefs.columnVisibility]);

  // Debounced so a column drag writes once at rest, not on every mousemove.
  useEffect(() => {
    const handle = setTimeout(
      () => safeSave(storageKey, { ...prefs, columnOrder: normalizedOrder }),
      200
    );
    return () => clearTimeout(handle);
  }, [storageKey, prefs, normalizedOrder]);

  const onColumnSizingChange = useCallback(
    (updater: Updater<Record<string, number>>) => {
      setPrefs((p) => ({
        ...p,
        columnSizing:
          typeof updater === "function" ? updater(p.columnSizing) : updater,
      }));
    },
    []
  );

  const onColumnVisibilityChange = useCallback(
    (updater: Updater<VisibilityState>) => {
      setPrefs((p) => ({
        ...p,
        columnVisibility:
          typeof updater === "function" ? updater(p.columnVisibility) : updater,
      }));
    },
    []
  );

  const onColumnOrderChange = useCallback((updater: Updater<string[]>) => {
    setPrefs((p) => ({
      ...p,
      columnOrder: typeof updater === "function" ? updater(p.columnOrder) : updater,
    }));
  }, []);

  const reset = useCallback(() => {
    setPrefs(DEFAULT);
    safeSave(storageKey, DEFAULT);
  }, [storageKey]);

  return {
    state: {
      columnSizing: prefs.columnSizing,
      columnVisibility,
      columnOrder: normalizedOrder,
    },
    handlers: {
      onColumnSizingChange,
      onColumnVisibilityChange,
      onColumnOrderChange,
    },
    reset,
  };
}
