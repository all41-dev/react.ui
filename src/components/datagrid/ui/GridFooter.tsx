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
 * The band under the body. Which of the two footers appears is the whole of this
 * component's logic:
 *
 * - the list view gets the real pager. Pagination applies to the ungrouped list only —
 *   the cards grid shows the whole filtered set and grouping replaces pagination
 *   outright, so a pager under either would be lying. Grouping keeps the footer for
 *   its total.
 * - the cards view has no pager, but the bulk-selection pill still needs somewhere to
 *   live, so it gets a minimal band of its own.
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
  /* The FILTERED count, not rows.length — otherwise page counts and the "X to Y of Z"
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
