import { useCallback, useEffect, useRef, useState } from "react";

/** How long a just-written row stays marked. Matches `ruiRowFlash` in base.css. */
const FLASH_MS = 1600;

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

  /*
   * The row a write just landed on, cleared after the flash. Without it a save that only
   * touched a hidden or off-screen column looks like it did nothing — the form closes and
   * the table appears unchanged.
   */
  const [changedRowId, setChangedRowId] = useState<string | number>();
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flash = useCallback((id: string | number | undefined) => {
    if (id === undefined) return;
    clearTimeout(flashTimer.current);
    setChangedRowId(id);
    flashTimer.current = setTimeout(() => setChangedRowId(undefined), FLASH_MS);
  }, []);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  /** Replace the row matching `prevRow`'s id with the server's version. */
  const replaceRow = useCallback(
    (prevRow: TRow, saved: TRow) => {
      const prevId = getId(prevRow);
      /* Object identity for a row the grid cannot key: `sameRowId` is false whenever
         either side is undefined, so an id-less row would otherwise never be replaced
         and the save would look like it did nothing. */
      const isTarget = (r: TRow) =>
        prevId === undefined ? r === prevRow : sameRowId(getId(r), prevId);
      setRows((prev) => prev.map((r) => (isTarget(r) ? saved : r)));
      flash(getId(saved) ?? prevId);
    },
    [getId, flash]
  );

  const addRow = useCallback(
    (created: TRow) => {
      setRows((prev) => [...prev, created]);
      flash(getId(created));
    },
    [getId, flash]
  );

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

  return { rows, replaceRow, addRow, removeRow, changedRowId };
}
