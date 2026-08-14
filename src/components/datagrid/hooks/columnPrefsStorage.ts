export type ColumnPrefs = {
  columnSizing: Record<string, number>;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  v: number;
};

const VERSION = 1;

export const DEFAULT_PREFS: ColumnPrefs = {
  columnSizing: {},
  columnOrder: [],
  columnVisibility: {},
  v: VERSION,
};

export function safeLoad(key: string): ColumnPrefs {
  try {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ColumnPrefs> | null;
    // A stored blob from an older shape is discarded rather than merged — merging
    // half-migrated preferences produces layouts nobody chose.
    if (!parsed || parsed.v !== VERSION) return DEFAULT_PREFS;
    return {
      columnSizing: parsed.columnSizing ?? {},
      columnOrder: Array.isArray(parsed.columnOrder) ? parsed.columnOrder : [],
      columnVisibility: parsed.columnVisibility ?? {},
      v: VERSION,
    };
  } catch {
    // Private mode, quota, or malformed JSON — fall back to defaults.
    return DEFAULT_PREFS;
  }
}

/**
 * Drops the entry entirely. Used by "Reset layout": storing the defaults and storing
 * nothing behave identically on load, and leaving no entry means an untouched grid — or
 * one the user has reset — keeps nothing in `localStorage` at all.
 */
export function safeRemove(key: string) {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable — preferences are best-effort */
  }
}

export function safeSave(key: string, prefs: ColumnPrefs) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — preferences are best-effort */
  }
}
