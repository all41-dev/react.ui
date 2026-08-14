import type { Table } from "@tanstack/react-table";

/** Zero-width overlay columns — excluded from width arithmetic. */
const OVERLAY_COLS = new Set(["__actions__"]);

/**
 * Widths for the table's `<colgroup>`.
 *
 * The final data column absorbs whatever container width the others leave, so the table
 * fills its wrapper. An explicit width on that column wins outright and may leave a
 * trailing gap — `resetSize` (Home, or double-click the handle) restores the fill.
 *
 * Nothing here is cached on the column instances. TanStack rebuilds every `Column` when
 * the column-def array changes identity, which happens on any reorder — including one
 * that only moves columns past a hidden neighbour and so leaves the visible id list
 * untouched. A cache keyed on that id list hands back instances the table has discarded,
 * and identity checks against them silently stop matching.
 */
export function useColumnLayout<TRow extends object>(
  table: Table<TRow>,
  containerW: number
) {
  const leafColsAll = table.getVisibleLeafColumns();
  // `columnSizing` only holds columns the user has actually dragged.
  const columnSizing = table.getState().columnSizing;

  const dataCols = leafColsAll.filter((c) => !OVERLAY_COLS.has(c.id));
  const lastDataColId = dataCols[dataCols.length - 1]?.id;

  let baseTotal = 0;
  for (let i = 0; i < dataCols.length - 1; i += 1) {
    baseTotal += dataCols[i].getSize?.() ?? 0;
  }

  const own = dataCols[dataCols.length - 1]?.getSize?.() ?? 0;
  const stored =
    lastDataColId !== undefined ? columnSizing[lastDataColId] : undefined;
  /* An explicit width wins outright, taken from the raw sizing state rather than
     `getSize()`: the read path clamps to `maxSize`, but the stretch already paints past
     it, so a resize anchored to that painted width would snap back on its first step.
     `Math.max(own, stored)` keeps the raw value above `maxSize` while `getSize()` still
     enforces `minSize` below. */
  const lastColWidth =
    stored !== undefined
      ? Math.max(own, stored)
      : Math.max(own, containerW - baseTotal);

  return {
    leafColsAll,
    lastDataColId,
    lastColWidth,
    tableW: baseTotal + lastColWidth,
  };
}
