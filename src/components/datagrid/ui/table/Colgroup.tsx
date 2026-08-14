import type { Column } from "@tanstack/react-table";

type Props = {
  leafColsAll: Column<any, unknown>[];
  /** Matched by id, never by identity — TanStack replaces column instances on reorder. */
  lastDataColId: string | undefined;
  lastColWidth: number;
};

/** Zero-width columns whose cells are laid out by position, not by the colgroup. */
const OVERLAY_COLS = new Set(["__actions__"]);

/**
 * One `<col>` per visible leaf column, in the table's own column order.
 *
 * Every column has to be covered: under `table-fixed` a colgroup narrower than the
 * `<table>` width leaves the browser to redistribute the surplus, so the painted widths
 * stop matching the model and drag-resizing no longer tracks the pointer.
 */
export function Colgroup({ leafColsAll, lastDataColId, lastColWidth }: Props) {
  return (
    <colgroup>
      {leafColsAll.map((col) => {
        if (OVERLAY_COLS.has(col.id)) {
          return <col key={col.id} style={{ width: 0 }} />;
        }
        const w =
          col.id === lastDataColId ? lastColWidth : col.getSize?.() ?? 0;
        return <col key={col.id} style={{ width: `${w}px` }} />;
      })}
    </colgroup>
  );
}
