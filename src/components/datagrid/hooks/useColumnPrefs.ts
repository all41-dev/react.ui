import { useMemo, useState, useCallback } from "react";
// import { useEffect } from "react"; // TEMPORARILY DISABLED

type ColumnPrefs = {
  columnSizing: Record<string, number>;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  v: number;
};

const DEFAULT: ColumnPrefs = {
  columnSizing: {},
  columnOrder: [],
  columnVisibility: {},
  v: 1,
};

// TEMPORARILY DISABLED: User preferences loading/saving
// function safeLoad(key: string): ColumnPrefs {
//   try {
//     if (typeof window === "undefined") return DEFAULT;
//     const raw = localStorage.getItem(key);
//     if (!raw) return DEFAULT;
//     const parsed = JSON.parse(raw);
//     return { ...DEFAULT, ...(parsed || {}) };
//   } catch {
//     return DEFAULT;
//   }
// }

// function safeSave(key: string, prefs: ColumnPrefs) {
//   try {
//     if (typeof window === "undefined") return;
//     localStorage.setItem(key, JSON.stringify(prefs));
//   } catch {}
// }

export function useColumnPrefs(_storageKey: string, allColumnIds: string[]) {
  // TEMPORARILY DISABLED: User preferences disabled - always use defaults
  const [prefs, setPrefs] = useState<ColumnPrefs>(() => DEFAULT);

  const normalizedOrder = useMemo(() => {
    const known = new Set(allColumnIds);
    const kept = (prefs.columnOrder || []).filter((id) => known.has(id));
    const missing = allColumnIds.filter((id) => !kept.includes(id));
    return [...kept, ...missing];
  }, [prefs.columnOrder, allColumnIds]);

  // TEMPORARILY DISABLED: Don't save preferences
  // useEffect(() => {
  //   const handle = setTimeout(() => safeSave(storageKey, { ...prefs, columnOrder: normalizedOrder }));
  //   return () => clearTimeout(handle);
  // }, [storageKey, prefs, normalizedOrder]);

  const onColumnSizingChange = useCallback((updater: any) => {
    setPrefs((p) => ({
      ...p,
      columnSizing: typeof updater === "function" ? updater(p.columnSizing) : updater,
    }));
  }, []);

  const onColumnVisibilityChange = useCallback((updater: any) => {
    setPrefs((p) => ({
      ...p,
      columnVisibility: typeof updater === "function" ? updater(p.columnVisibility) : updater,
    }));
  }, []);

  const onColumnOrderChange = useCallback((updater: any) => {
    setPrefs((p) => ({
      ...p,
      columnOrder: typeof updater === "function" ? updater(p.columnOrder) : updater,
    }));
  }, []);

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
    reset: () => setPrefs(DEFAULT),
  };
}
