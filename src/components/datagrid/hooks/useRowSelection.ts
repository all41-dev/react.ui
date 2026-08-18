import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const EMPTY_SELECTION: ReadonlySet<string> = new Set();

type Params<TRow> = {
  /** The parent's canonical data. Watched by identity to prune stale selections. */
  initialData: TRow[];
  /** The rows currently displayed, used to resolve keys back to objects for the callback. */
  rows: TRow[];
  /**
   * The grid's row identity — the same function the table gets as `getRowId`, so the keys
   * held here are exactly the `row.id`s the checkbox cells toggle.
   */
  getKey: (row: TRow) => string;
  onSelectionChange?: (rows: TRow[]) => void;
};

/**
 * Checkbox selection (multi). Keys survive paging and filtering — the set is the source
 * of truth, not TanStack's own row-selection state.
 */
export function useRowSelection<TRow>({
  initialData,
  rows,
  getKey,
  onSelectionChange,
}: Params<TRow>) {
  const [selectedIds, setSelectedIds] =
    useState<ReadonlySet<string>>(EMPTY_SELECTION);

  /*
   * Prune to ids that still exist whenever the parent swaps the data: a refetch keeps
   * the selection, a dataset swap effectively clears it. Reconciled during render for
   * the same reason `useGridRows` does it — an effect would paint one frame with a
   * selection count that no longer matches the data.
   */
  const [syncedData, setSyncedData] = useState(initialData);
  if (initialData !== syncedData) {
    setSyncedData(initialData);
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const alive = new Set((initialData ?? []).map((r) => getKey(r)));
      const next = new Set([...prev].filter((id) => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setPage = useCallback((pageIds: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(EMPTY_SELECTION), []);

  const deselect = useCallback((key: string) => {
    setSelectedIds((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  /*
   * Notify the consumer with row objects, not keys. The guard compares what would be
   * announced against what WAS announced, and must compare BOTH the key set and the
   * resolved row objects: the keys alone are unchanged by a refetch that swaps the row
   * objects or by a local `replaceRow`, which would leave the consumer holding stale
   * copies of the selected rows indefinitely.
   *
   * Compared through a ref inside the effect rather than by trimming the dependency list,
   * which keeps every ref access out of render.
   *
   * `null` means nothing has been announced yet: the initial empty selection is skipped,
   * because announcing "nothing is selected" on mount is noise.
   */
  const lastAnnouncedRef = useRef<{
    ids: ReadonlySet<string>;
    rows: TRow[];
  } | null>(null);
  useEffect(() => {
    const selectedRows = rows.filter((r) => selectedIds.has(getKey(r)));
    const prev = lastAnnouncedRef.current;
    const same =
      prev !== null &&
      prev.ids === selectedIds &&
      prev.rows.length === selectedRows.length &&
      prev.rows.every((r, i) => r === selectedRows[i]);
    if (same) return;
    lastAnnouncedRef.current = { ids: selectedIds, rows: selectedRows };
    if (prev === null && selectedIds.size === 0) return;
    onSelectionChange?.(selectedRows);
  }, [selectedIds, rows, getKey, onSelectionChange]);

  /** The value handed to `DataGridSelectionContext`. */
  const contextValue = useMemo(
    () => ({ selectedIds, toggleRow, setPage }),
    [selectedIds, toggleRow, setPage]
  );

  return { selectedIds, toggleRow, setPage, clear, deselect, contextValue };
}
