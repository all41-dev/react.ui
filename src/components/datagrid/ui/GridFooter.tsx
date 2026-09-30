import type { Table } from "@tanstack/react-table";

import { DataGridPagination } from "./DataGridPagination";
import { SelectionPill } from "./SelectionPill";

type GridFooterProps<TRow extends object> = {
  table: Table<TRow>;
  paginationEnabled: boolean;
  pageSizeOptions?: number[];
  showCards: boolean;
  /** True when grouping is active — the pager degrades to a total-only footer. */
  grouped: boolean;
  selectable: boolean;
  selectedCount: number;
  onClearSelection: () => void;
};

/**
 * The band under the body — one of two footers.
 *
 * The pager belongs to the ungrouped list view only: the cards grid shows the whole
 * filtered set and grouping replaces paging altogether, so a pager under either would be
 * misleading. Everything else gets a minimal band carrying the row count and the
 * bulk-selection pill.
 */
export function GridFooter<TRow extends object>({
  table,
  paginationEnabled,
  pageSizeOptions,
  showCards,
  grouped,
  selectable,
  selectedCount,
  onClearSelection,
}: GridFooterProps<TRow>) {
  /* The filtered count, not the total — otherwise page counts and the "X to Y of Z"
     range ignore any active column filter. `flatRows`, so a tree counts every node
     rather than its roots; in a flat grid the two are the same list. */
  const filteredCount = table.getFilteredRowModel().flatRows.length;
  /* A tree's row model is its open nodes only, so fewer rows can be on screen than are
     counted. Tree mode alone: under the cards view a flat grid's row model is one page. */
  const onScreen = table.options.getSubRows
    ? table.getRowModel().rows.length
    : filteredCount;

  if (paginationEnabled && !showCards) {
    return (
      <DataGridPagination
        table={table}
        totalCount={filteredCount}
        selectedCount={selectable ? selectedCount : 0}
        onClearSelection={selectable ? onClearSelection : undefined}
        totalOnly={grouped}
        pageSizeOptions={pageSizeOptions}
      />
    );
  }

  /* No pager on screen: the cards view, and any list view with paging turned off. The
     count is unconditional — the cards grid has no other place that reports how many rows
     are on screen. `SelectionPill` hides itself at zero. */
  return (
    <div className="flex items-center gap-3 border-t border-border-default bg-surface-card px-3.5 py-[9px] text-[.75rem] text-muted">
      <SelectionPill
        count={selectable ? selectedCount : 0}
        onClear={onClearSelection}
      />
      <span aria-live="polite" className="text-[.75rem] text-muted">
        {onScreen < filteredCount ? `${onScreen} of ${filteredCount}` : filteredCount} shown
      </span>
    </div>
  );
}
