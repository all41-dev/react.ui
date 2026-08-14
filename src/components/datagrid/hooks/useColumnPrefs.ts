import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PREFS,
  safeLoad,
  safeRemove,
  safeSave,
  type ColumnPrefs,
} from "./columnPrefsStorage";
import {
  mergeVisibility,
  normalizeOrder,
  prefsAreDefault,
} from "./columnPrefsDerive";
import { useColumnPrefsHandlers } from "./useColumnPrefsHandlers";

/** Stable identity, so the visibility memo below doesn't rerun on every render. */
const NO_DEFAULT_HIDDEN: string[] = [];

/**
 * Column sizing, order and visibility, persisted per `storageKey`.
 *
 * `defaultHiddenIds` are the columns that start hidden — see `meta.visibleInTable`.
 * `forceHiddenIds` are hidden regardless of what the user chose, for as long as they are
 * passed — see `meta.hideOnMobile`. Neither is ever written to storage.
 */
export function useColumnPrefs(
  storageKey: string,
  allColumnIds: string[],
  defaultHiddenIds: string[] = NO_DEFAULT_HIDDEN,
  forceHiddenIds: string[] = NO_DEFAULT_HIDDEN
) {
  const [prefs, setPrefs] = useState<ColumnPrefs>(() => safeLoad(storageKey));
  /* The storage key whose preferences the user has actually changed. Nothing is written
     back until they have — see the save effect below. Holds a key rather than a boolean
     so switching grids doesn't carry the previous grid's dirty state over. */
  const [touchedKey, setTouchedKey] = useState<string | null>(null);

  // Switching grids (or storageKey) must load that grid's own preferences rather than
  // carrying the previous one's over. Reconciled during render, not in an effect, so the
  // first paint already uses the right layout.
  const [loadedKey, setLoadedKey] = useState(storageKey);
  if (storageKey !== loadedKey) {
    setLoadedKey(storageKey);
    setPrefs(safeLoad(storageKey));
  }

  const normalizedOrder = useMemo(
    () => normalizeOrder(prefs.columnOrder || [], allColumnIds),
    [prefs.columnOrder, allColumnIds]
  );

  const columnVisibility = useMemo(
    () =>
      mergeVisibility(prefs.columnVisibility, defaultHiddenIds, forceHiddenIds),
    [defaultHiddenIds, forceHiddenIds, prefs.columnVisibility]
  );

  /*
   * Only a real change is written. Persisting on mount would store a full `columnOrder`
   * for a grid nobody has touched, and `normalizeOrder` appends unknown ids — so a column
   * added between two others in a later release would land at the end of the table
   * permanently, for every user who has ever opened the grid.
   *
   * Debounced so a column drag writes once at rest, not on every mousemove.
   */
  useEffect(() => {
    if (touchedKey !== storageKey) return;
    const handle = setTimeout(
      () => safeSave(storageKey, { ...prefs, columnOrder: normalizedOrder }),
      200
    );
    return () => clearTimeout(handle);
  }, [storageKey, prefs, normalizedOrder, touchedKey]);

  /** Marks the prefs as user-touched, so the effect above starts persisting them. */
  const updatePrefs = useCallback(
    (update: (p: ColumnPrefs) => ColumnPrefs) => {
      setTouchedKey(storageKey);
      setPrefs(update);
    },
    [storageKey]
  );

  const handlers = useColumnPrefsHandlers(updatePrefs, allColumnIds);

  /* The entry is dropped rather than overwritten with the defaults: the two load
     identically, and removing writes nothing for a grid that was never stored. Un-marked
     as touched too, or the save effect would put the defaults straight back. */
  const reset = useCallback(() => {
    setTouchedKey(null);
    setPrefs(DEFAULT_PREFS);
    safeRemove(storageKey);
  }, [storageKey]);

  const isDefault = useMemo(
    () => prefsAreDefault(prefs, allColumnIds),
    [prefs, allColumnIds]
  );

  return {
    isDefault,
    state: {
      columnSizing: prefs.columnSizing,
      columnVisibility,
      columnOrder: normalizedOrder,
    },
    handlers,
    reset,
  };
}
