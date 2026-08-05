import { useCallback, useEffect, useMemo, useState } from "react";

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

/**
 * Column sizing / order / visibility, persisted per `storageKey`.
 *
 * The persistence here used to be entirely commented out while `storageKey` was still
 * threaded through the public API, so the prop silently did nothing.
 */
export function useColumnPrefs(storageKey: string, allColumnIds: string[]) {
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

  // Debounced so a column drag writes once at rest, not on every mousemove.
  useEffect(() => {
    const handle = setTimeout(
      () => safeSave(storageKey, { ...prefs, columnOrder: normalizedOrder }),
      200
    );
    return () => clearTimeout(handle);
  }, [storageKey, prefs, normalizedOrder]);

  const onColumnSizingChange = useCallback((updater: any) => {
    setPrefs((p) => ({
      ...p,
      columnSizing: typeof updater === "function" ? updater(p.columnSizing) : updater,
    }));
  }, []);

  const onColumnVisibilityChange = useCallback((updater: any) => {
    setPrefs((p) => ({
      ...p,
      columnVisibility:
        typeof updater === "function" ? updater(p.columnVisibility) : updater,
    }));
  }, []);

  const onColumnOrderChange = useCallback((updater: any) => {
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
      columnVisibility: prefs.columnVisibility,
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
