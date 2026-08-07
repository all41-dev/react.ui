import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const EMPTY_SELECTION: ReadonlySet<string> = new Set();

type Params<TRow> = {
  /** The parent's canonical data. Watched by identity to prune stale selections. */
  initialData: TRow[];
  /** The rows currently displayed, used to resolve ids back to objects for the callback. */
  rows: TRow[];
  getId: (row: TRow) => string | number | undefined;
  onSelectionChange?: (rows: TRow[]) => void;
};

/**
 * Checkbox selection (multi). Ids are stored as strings and survive paging and
 * filtering — the set is the source of truth, not TanStack's own row-selection state.
 */
export function useRowSelection<TRow>({
  initialData,
  rows,
  getId,
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
      const alive = new Set((initialData ?? []).map((r) => String(getId(r))));
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

  const deselect = useCallback((id: string | number | undefined) => {
    if (id === undefined) return;
    setSelectedIds((prev) => {
      if (!prev.has(String(id))) return prev;
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
  }, []);

  /*
   * Notify the consumer with row objects (not ids). The guard compares what would be
   * announced against what WAS announced — both the selection set and the resolved row
   * objects. Comparing the set alone silenced real changes: a refetch that replaces the
   * row objects (same ids) or a local `replaceRow` after an edit left the consumer's
   * copy of the selected rows permanently stale. A ref compared inside the effect rather
   * than a trimmed dependency list, which keeps every ref access out of render.
   *
   * `null` means nothing has been announced yet: the initial empty selection is skipped,
   * because announcing "nothing is selected" on mount is noise.
   */
  const lastAnnouncedRef = useRef<{
    ids: ReadonlySet<string>;
    rows: TRow[];
  } | null>(null);
  useEffect(() => {
    const selectedRows = rows.filter((r) => selectedIds.has(String(getId(r))));
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
  }, [selectedIds, rows, getId, onSelectionChange]);

  /** The value handed to `DataGridSelectionContext`. */
  const contextValue = useMemo(
    () => ({ selectedIds, toggleRow, setPage }),
    [selectedIds, toggleRow, setPage]
  );

  return { selectedIds, toggleRow, setPage, clear, deselect, contextValue };
}
