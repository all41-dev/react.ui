import type { Table } from "@tanstack/react-table";
import { useMemo } from "react";

/** Zero-width overlay columns — excluded from width arithmetic. */
const OVERLAY_COLS = new Set(["__actions__"]);

/**
 * Widths for the table's <colgroup>. The final data column absorbs any leftover
 * container width so the table fills its wrapper without a trailing gap.
 */
export function useColumnLayout<TRow extends object>(
  table: Table<TRow>,
  containerW: number
) {
  const leafColsAll = table.getVisibleLeafColumns();

  // Derived every render, so these are memo INPUTS, not memo outputs — keying the
  // arithmetic on the id list keeps it from recomputing on unrelated renders (the
  // previous version memoized on freshly-built arrays and so never stabilized).
  const idKey = leafColsAll.map((c) => c.id).join("|");
  const sizeKey = leafColsAll.map((c) => c.getSize?.() ?? 0).join("|");

  // `columnSizing` only holds columns the user has actually dragged.
  const columnSizing = table.getState().columnSizing;

  const dataCols = useMemo(
    () => leafColsAll.filter((c) => !OVERLAY_COLS.has(c.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idKey]
  );
  const lastDataCol = dataCols[dataCols.length - 1];

  const { baseTotal, lastColWidth, tableW } = useMemo(() => {
    const base = dataCols
      .filter((c) => c !== lastDataCol)
      .reduce((sum, c) => sum + (c.getSize?.() ?? 0), 0);

    const own = lastDataCol?.getSize?.() ?? 0;
    const leftover = containerW - base;

    /*
     * The last column stretches to fill leftover container width — but only while the
     * user hasn't sized it themselves. `Math.max(own, leftover)` unconditionally pinned
     * it to the leftover, so dragging it narrower snapped straight back and the column
     * was effectively un-resizable (#14). An explicit drag now wins outright.
     */
    const wasResized =
      !!lastDataCol && columnSizing[lastDataCol.id] !== undefined;
    const lastW = wasResized ? own : Math.max(own, leftover);

    return { baseTotal: base, lastColWidth: lastW, tableW: base + lastW };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataCols, lastDataCol, containerW, sizeKey, columnSizing]);

  return { leafColsAll, dataCols, lastDataCol, baseTotal, lastColWidth, tableW };
}
