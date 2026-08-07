import type { Column, Table } from "@tanstack/react-table";

/** Injected columns are structural — users reorder and hide their own columns only. */
const FIXED_IDS = new Set(["__select__", "__actions__"]);

/**
 * The user-facing column list for the Columns popover: the movable columns in render
 * order, plus the one operation the popover performs on them.
 */
export function useColumnOrdering<TRow extends object>(table: Table<TRow>) {
  const allColumns = table.getAllLeafColumns().filter((c) => !FIXED_IDS.has(c.id));
  // `getAllLeafColumns` is definition order; the popover has to show render order.
  const order = table.getState().columnOrder;
  const movable = order.filter((id) => !FIXED_IDS.has(id));
  const ordered = movable
    .map((id) => allColumns.find((c) => c.id === id))
    .filter((c): c is Column<TRow, unknown> => !!c);
  /*
   * The fallback relies on an invariant: `useColumnPrefs.normalizedOrder` always
   * reconciles `columnOrder` to the full id list (and `useDataGridState` guarantees the
   * storageKey that turns it on), so `ordered` is complete and the fallback never runs.
   * If that ever slips, note `move` below still indexes into `movable` — the two lists
   * would disagree and the nudge buttons would act on the wrong column.
   */
  const columns = ordered.length === allColumns.length ? ordered : allColumns;

  const visibleCount = columns.filter((c) => c.getIsVisible()).length;

  /*
   * Swap within the movable subset, then stitch back into the full order at the same
   * slots — so `__select__` stays leading and `__actions__` stays trailing no matter
   * how the data columns are rearranged.
   */
  const move = (columnId: string, delta: -1 | 1) => {
    const from = movable.indexOf(columnId);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= movable.length) return;
    const swapped = [...movable];
    [swapped[from], swapped[to]] = [swapped[to], swapped[from]];
    let k = 0;
    table.setColumnOrder(order.map((id) => (FIXED_IDS.has(id) ? id : swapped[k++])));
  };

  return { columns, visibleCount, hiddenCount: columns.length - visibleCount, move };
}
