import type { Table } from "@tanstack/react-table";
import type { Ref } from "react";
import { HeaderCell } from "./HeaderCell";
import { HeaderFilter } from "./HeaderFilter";

/** The sticky header rows plus, when toggled, the per-column filter row. */
export function TableHead<TRow extends object>({
  table,
  showFilters,
  headRef,
  lastDataColId,
  lastColWidth,
}: {
  table: Table<TRow>;
  showFilters?: boolean;
  /** Measured by the virtualizer — the sticky head offsets every row position. */
  headRef: Ref<HTMLTableSectionElement>;
  /** The stretched column, whose painted width is not its `getSize()`. */
  lastDataColId?: string;
  lastColWidth?: number;
}) {
  const paintedWidth = (id: string, size: number) =>
    id === lastDataColId && lastColWidth !== undefined ? lastColWidth : size;

  return (
    <thead ref={headRef} className="sticky top-0 z-1 bg-surface-inset">
      {/* Under `role="grid"` the header rows are rows 1..n — the body picks up from
          n+1, which is what `TableView` computes the offset for. */}
      {table.getHeaderGroups().map((hg, i) => (
        <tr key={hg.id} aria-rowindex={i + 1}>
          {hg.headers.map((h) => (
            <HeaderCell
              key={h.id}
              h={h}
              renderedWidth={paintedWidth(h.column.id, h.column.getSize())}
            />
          ))}
        </tr>
      ))}
      {/* Filter row lives in thead so it stays sticky under the header. It sits on
          the CARD surface, not the inset one — the inset is reserved for the
          header above it, and stacking two insets erased the boundary. */}
      {showFilters && (
        /* Entry only — the row unmounts on close, so there is nothing to animate
           out. Enough to show the row arriving rather than appearing instantly. */
        <tr
          className="animate-slide-down bg-surface-card"
          aria-rowindex={table.getHeaderGroups().length + 1}
        >
          {table
            .getHeaderGroups()
            .at(-1)!
            .headers.map((h) =>
              h.isPlaceholder || h.column.id === "__actions__" ? (
                <th key={h.id} className="!w-0 !p-0 border-none" aria-hidden="true" />
              ) : (
                <th
                  key={h.id}
                  className="h-9 border-b border-border-default px-2 text-left align-middle font-normal normal-case tracking-normal"
                >
                  <HeaderFilter h={h} />
                </th>
              )
            )}
        </tr>
      )}
    </thead>
  );
}
