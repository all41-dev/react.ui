import type { Column, Table } from "@tanstack/react-table";

/** Injected columns are structural — users reorder and hide their own columns only. */
const FIXED_IDS = new Set(["__select__", "__actions__"]);

/**
 * The user-facing column list for the Columns popover: the movable columns in render
 * order, plus the one operation the popover performs on them.
 *
 * `forcedHiddenIds` are columns the viewport has taken over (`meta.hideOnMobile`). They
 * are dropped entirely rather than listed as unchecked: the forced layer wins over stored
 * visibility, so a checkbox for one would report "hidden", accept a click, write a
 * preference and change nothing on screen. Dropping them also keeps `hiddenCount` — the
 * trigger's badge — reporting only what the user actually hid.
 *
 * `leadColumnId` (the configured tree column) is listed, so it can still be hidden, and
 * holds the first slot: `isHeld` tells the popover to offer no move on it or past it.
 */
export function useColumnOrdering<TRow extends object>(
  table: Table<TRow>,
  forcedHiddenIds: readonly string[] = [],
  leadColumnId?: string
) {
  /* Both kinds hold their slot in `columnOrder` and stay out of the popover's list — the
     injected columns because they are structural, the forced ones because the viewport
     owns them. `move` stitches around them, so they must be excluded consistently. */
  const forced = new Set(forcedHiddenIds);
  const isPinned = (id: string) => FIXED_IDS.has(id) || forced.has(id);

  const allColumns = table.getAllLeafColumns().filter((c) => !isPinned(c.id));
  // `getAllLeafColumns` is definition order; the popover has to show render order.
  const order = table.getState().columnOrder;
  const listed = order.filter((id) => !isPinned(id));
  const isHeld = (id: string) => id === leadColumnId;
  const movable = listed.filter((id) => !isHeld(id));
  const ordered = listed
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
   * slots — so `__select__` stays leading, `__actions__` stays trailing and a
   * viewport-hidden column keeps its position for when the viewport widens again, no
   * matter how the data columns are rearranged.
   */
  const move = (columnId: string, delta: -1 | 1) => {
    const from = movable.indexOf(columnId);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= movable.length) return;
    const swapped = [...movable];
    [swapped[from], swapped[to]] = [swapped[to], swapped[from]];
    let k = 0;
    table.setColumnOrder(
      order.map((id) => (isPinned(id) || isHeld(id) ? id : swapped[k++]))
    );
  };

  /** Where a column stands among those that can move; `null` for one that cannot. */
  const slot = (columnId: string): { isFirst: boolean; isLast: boolean } | null => {
    const at = movable.indexOf(columnId);
    return at === -1 ? null : { isFirst: at === 0, isLast: at === movable.length - 1 };
  };

  return {
    columns,
    visibleCount,
    hiddenCount: columns.length - visibleCount,
    move,
    slot,
  };
}
