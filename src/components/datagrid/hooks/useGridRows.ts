import { useCallback, useEffect, useRef, useState } from "react";

/** How long a just-written row stays marked. Matches `ruiRowFlash` in base.css. */
const FLASH_MS = 1600;

type Params<TRow> = {
  initialData: TRow[];
  /** The grid's row identity — the same function the table gets as `getRowId`. */
  getKey: (row: TRow) => string;
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
export function useGridRows<TRow>({ initialData, getKey }: Params<TRow>) {
  const [rows, setRows] = useState<TRow[]>(() => initialData ?? []);

  const [syncedData, setSyncedData] = useState(initialData);
  if (initialData !== syncedData) {
    setSyncedData(initialData);
    setRows(initialData ?? []);
  }

  /*
   * The row a write just landed on, cleared after the flash. Without it a save that only
   * touched a hidden or off-screen column looks like it did nothing — the form closes and
   * the table appears unchanged.
   */
  const [changedRowId, setChangedRowId] = useState<string>();
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flash = useCallback((key: string) => {
    clearTimeout(flashTimer.current);
    setChangedRowId(key);
    flashTimer.current = setTimeout(() => setChangedRowId(undefined), FLASH_MS);
  }, []);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  /** Replace the row matching `prevRow`'s key with the server's version. */
  const replaceRow = useCallback(
    (prevRow: TRow, saved: TRow) => {
      const prevKey = getKey(prevRow);
      setRows((prev) => prev.map((r) => (getKey(r) === prevKey ? saved : r)));
      /* Flash the saved row's key: a write is free to change the id the row is keyed by,
         and the row on screen is the saved one. */
      flash(getKey(saved));
    },
    [getKey, flash]
  );

  const addRow = useCallback(
    (created: TRow) => {
      setRows((prev) => [...prev, created]);
      flash(getKey(created));
    },
    [getKey, flash]
  );

  /*
   * Dropped locally so a plain `onDelete` consumer (no query adapter re-supplying
   * `initialData`) doesn't watch a successfully deleted row stay on screen.
   */
  const removeRow = useCallback(
    (row: TRow) => {
      const deletedKey = getKey(row);
      setRows((prev) => prev.filter((r) => getKey(r) !== deletedKey));
    },
    [getKey]
  );

  return { rows, replaceRow, addRow, removeRow, changedRowId };
}
