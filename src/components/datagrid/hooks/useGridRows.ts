import { useCallback, useState } from "react";

/** Row ids arrive as string | number depending on the accessor; compare them as text. */
export const sameRowId = (
  a: string | number | undefined,
  b: string | number | undefined
) => a !== undefined && b !== undefined && String(a) === String(b);

type Params<TRow> = {
  initialData: TRow[];
  getId: (row: TRow) => string | number | undefined;
};

/**
 * Owns the displayed rows.
 *
 * Seeded from `initialData` and then held locally so create/edit/delete show up
 * immediately. Reconciled during render rather than in an effect: no extra render pass,
 * and no window in which the grid shows data the parent has already replaced.
 *
 * `initialData` must be a stable reference — the same contract TanStack Table places on
 * its own `data` prop. Rebuilding the array inline on every render discards any pending
 * local mutation.
 */
export function useGridRows<TRow>({ initialData, getId }: Params<TRow>) {
  const [rows, setRows] = useState<TRow[]>(() => initialData ?? []);

  const [syncedData, setSyncedData] = useState(initialData);
  if (initialData !== syncedData) {
    setSyncedData(initialData);
    setRows(initialData ?? []);
  }

  /** Replace the row matching `prevRow`'s id with the server's version. */
  const replaceRow = useCallback(
    (prevRow: TRow, saved: TRow) => {
      const prevId = getId(prevRow);
      setRows((prev) =>
        prev.map((r) => (sameRowId(getId(r), prevId) ? saved : r))
      );
    },
    [getId]
  );

  const addRow = useCallback((created: TRow) => {
    setRows((prev) => [...prev, created]);
  }, []);

  /*
   * Dropped locally so a plain `onDelete` consumer (no query adapter re-supplying
   * `initialData`) doesn't watch a successfully deleted row stay on screen.
   */
  const removeRow = useCallback(
    (row: TRow) => {
      const deletedId = getId(row);
      setRows((prev) => prev.filter((r) => !sameRowId(getId(r), deletedId)));
    },
    [getId]
  );

  return { rows, replaceRow, addRow, removeRow };
}
