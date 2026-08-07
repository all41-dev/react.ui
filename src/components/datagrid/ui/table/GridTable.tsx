import type { Column, Table } from "@tanstack/react-table";
import type { ReactNode, Ref } from "react";
import { Colgroup } from "./Colgroup";
import { TableHead } from "./TableHead";

type GridTableProps<TRow extends object> = {
  table: Table<TRow>;
  label?: string;
  showFilters?: boolean;
  headRef: Ref<HTMLTableSectionElement>;
  tableW: number;
  leafColsAll: Column<TRow, unknown>[];
  lastDataCol: Column<TRow, unknown> | undefined;
  lastColWidth: number;
  /** Header rows plus the page's flat body list — what `aria-rowindex` is numbered over. */
  rowCount: number;
  children: ReactNode;
};

/** The `<table>` shell — colgroup, sticky head and the grid ARIA — around the bodies. */
export function GridTable<TRow extends object>({
  table,
  label,
  showFilters,
  headRef,
  tableW,
  leafColsAll,
  lastDataCol,
  lastColWidth,
  rowCount,
  children,
}: GridTableProps<TRow>) {
  return (
    <table
      /*
       * `border-separate` with zero spacing, and it isn't cosmetic: a positioned cell
       * inside a collapsed-border table is undefined behaviour, and Chrome won't make
       * the sticky actions cell a containing block — so the floating pill lays out
       * from its static position, off the right edge of the scroll container. Note
       * that border spacing is ignored under `border-collapse` anyway.
       */
      className="table-fixed border-separate border-spacing-0"
      style={{ width: `${tableW}px` }}
      /*
       * `role="grid"` makes the `aria-selected` on each row valid ARIA — on a plain
       * table it is meaningless and assistive tech ignores it.
       *
       * `aria-rowcount` counts the same list `aria-rowindex` is numbered over — the
       * header rows plus the page's flat body list (group headers included), not the
       * mounted window and not the all-pages total. Mixing scopes announced
       * "row 1 of 500" for the first row of page 2.
       */
      role="grid"
      aria-label={label}
      aria-rowcount={rowCount}
      aria-colcount={leafColsAll.length}
    >
      <Colgroup
        leafColsAll={leafColsAll}
        lastDataCol={lastDataCol}
        lastColWidth={lastColWidth}
      />

      <TableHead table={table} showFilters={showFilters} headRef={headRef} />

      {children}
    </table>
  );
}
