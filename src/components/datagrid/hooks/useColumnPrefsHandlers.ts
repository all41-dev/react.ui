import { useCallback } from "react";
import type { Updater, VisibilityState } from "@tanstack/react-table";

import { normalizeOrder } from "./columnPrefsDerive";
import type { ColumnPrefs } from "./columnPrefsStorage";

/**
 * TanStack's `onXChange` contract adapted onto the stored preferences: each one may be
 * handed either a value or a functional updater, and has to fold it into one slice of the
 * prefs object.
 *
 * `updatePrefs` is the caller's setter — it also marks the prefs as user-touched, which is
 * what allows an untouched grid to stay out of storage.
 */
export function useColumnPrefsHandlers(
  updatePrefs: (update: (p: ColumnPrefs) => ColumnPrefs) => void,
  allColumnIds: string[]
) {
  const onColumnSizingChange = useCallback(
    (updater: Updater<Record<string, number>>) => {
      updatePrefs((p) => ({
        ...p,
        columnSizing:
          typeof updater === "function" ? updater(p.columnSizing) : updater,
      }));
    },
    [updatePrefs]
  );

  const onColumnVisibilityChange = useCallback(
    (updater: Updater<VisibilityState>) => {
      updatePrefs((p) => ({
        ...p,
        columnVisibility:
          typeof updater === "function" ? updater(p.columnVisibility) : updater,
      }));
    },
    [updatePrefs]
  );

  /* A functional updater has to reconcile against the order the table is actually
     rendering — `p.columnOrder` is empty until something has been persisted, so applying
     the updater to it would move columns around an empty list. Normalized from the state
     inside the callback, not from a snapshot: two updates batched before a re-render
     must compose instead of both resolving against the same base. */
  const onColumnOrderChange = useCallback(
    (updater: Updater<string[]>) => {
      updatePrefs((p) => ({
        ...p,
        columnOrder:
          typeof updater === "function"
            ? updater(normalizeOrder(p.columnOrder || [], allColumnIds))
            : updater,
      }));
    },
    [allColumnIds, updatePrefs]
  );

  return { onColumnSizingChange, onColumnVisibilityChange, onColumnOrderChange };
}
