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
 * The band under the body — one of two footers, or neither.
 *
 * The pager belongs to the ungrouped list view only: the cards grid shows the whole
 * filtered set and grouping replaces paging altogether, so a pager under either would
 * be misleading. Grouping still keeps the footer for its total, and the cards view gets
 * a minimal band of its own so the bulk-selection pill has somewhere to live.
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
     range ignore any active column filter. */
  const filteredCount = table.getFilteredRowModel().rows.length;

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

  if (showCards && selectable && selectedCount > 0) {
    return (
      <div className="flex items-center gap-3 border-t border-border-default bg-surface-card px-3.5 py-[9px] text-[.75rem] text-muted">
        <SelectionPill count={selectedCount} onClear={onClearSelection} />
        <span className="text-[.75rem] text-muted">{filteredCount} shown</span>
      </div>
    );
  }

  return null;
}
