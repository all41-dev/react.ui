import type { Column } from "@tanstack/react-table";

type Props = {
  leafColsAll: Column<any, unknown>[];
  lastDataCol: Column<any, unknown> | undefined;
  lastColWidth: number;
};

/** Zero-width columns whose cells are laid out by position, not by the colgroup. */
const OVERLAY_COLS = new Set(["__actions__"]);

/**
 * One <col> per visible leaf column, in the table's own column order.
 *
 * Previously this filtered `__actions__` out of the loop and appended a single zero-width
 * <col> at the end, which silently assumed the actions column was last — any other order
 * (or a leading selection column) sheared the whole layout by one cell. (#14)
 */
export function Colgroup({ leafColsAll, lastDataCol, lastColWidth }: Props) {
  return (
    <colgroup>
      {leafColsAll.map((col) => {
        if (OVERLAY_COLS.has(col.id)) {
          return <col key={col.id} style={{ width: 0 }} />;
        }
        const isLast = col === lastDataCol;
        const w = isLast ? lastColWidth : col.getSize?.() ?? 0;
        return <col key={col.id} style={{ width: `${w}px` }} />;
      })}
    </colgroup>
  );
}
