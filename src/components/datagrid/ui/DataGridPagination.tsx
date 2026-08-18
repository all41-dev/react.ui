import type { Table } from "@tanstack/react-table";

import { SelectionPill } from "./SelectionPill";
import { PagerControls } from "./pagination/PagerControls";

type Props<TRow extends object> = {
  table: Table<TRow>;
  totalCount?: number;
  pageSizeOptions?: number[];
  className?: string;
  sticky?: boolean;
  /** Checkbox-selection size for the bulk pill; 0 hides it. */
  selectedCount?: number;
  onClearSelection?: () => void;
  /**
   * Grouping replaces pagination — the footer then reports the total only, with no
   * page controls (there are no pages to move between).
   */
  totalOnly?: boolean;
};

/*
 * Don't memoize this. Every prop that matters is read off the live `table`, so a
 * comparator can't see a page change without also receiving `table.getState()` — a
 * literal rebuilt inside `useReactTable` on every render, which no memo can ever match.
 */
export function DataGridPagination<TRow extends object>({
  table,
  totalCount,
  pageSizeOptions = [10, 20, 50, 100],
  className = "",
  sticky = true,
  selectedCount = 0,
  onClearSelection,
  totalOnly = false,
}: Props<TRow>) {
  const { pageIndex, pageSize } = table.getState().pagination ?? {
    pageIndex: 0,
    pageSize: pageSizeOptions[0] ?? 10,
  };

  const filteredTotal =
    typeof totalCount === "number" ? totalCount : table.getFilteredRowModel().rows.length;

  const rawCount = table.getPageCount();
  const pageCount = Number.isFinite(rawCount)
    ? rawCount
    : Math.max(1, Math.ceil(filteredTotal / pageSize));

  const current = pageIndex + 1;
  const from = filteredTotal === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(current * pageSize, filteredTotal);
  const rangeMsg =
    filteredTotal === 0
      ? "No results"
      : totalOnly
        ? `${filteredTotal} ${filteredTotal === 1 ? "item" : "items"}`
        : `${from}–${to} of ${filteredTotal}`;

  const lastIndex = Math.max(0, pageCount - 1);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Never steal keys from the page-size select, or any future form control here —
    // arrow keys inside it must change the selection, not the page.
    const t = e.target as HTMLElement;
    if (t.closest("select, input, textarea")) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (e.shiftKey) table.setPageIndex(0);
      else table.previousPage();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (e.shiftKey) table.setPageIndex(lastIndex);
      else table.nextPage();
    }
    if (e.key === "Home") {
      e.preventDefault();
      table.setPageIndex(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      table.setPageIndex(lastIndex);
    }
  };

  return (
    <nav
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="Pagination"
      className={[
        "bg-surface-card border-t border-border-default px-3.5 py-[9px]",
        "flex flex-wrap items-center justify-between gap-3 text-[.75rem] text-muted",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]",
        sticky ? "sticky bottom-0 z-10" : "",
        className,
      ].join(" ")}
    >
      {/* LEFT: bulk-selection pill + range of the FILTERED set */}
      <div className="flex items-center gap-3">
        <SelectionPill count={selectedCount} onClear={onClearSelection} />
        <span aria-live="polite" className="text-[.75rem] text-muted">
          {rangeMsg}
        </span>
      </div>

      {/* RIGHT: page size + windowed pages (absent while grouping) */}
      <PagerControls
        current={current}
        pageCount={pageCount}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        canPrev={table.getCanPreviousPage()}
        canNext={table.getCanNextPage()}
        onPageChange={(index) => table.setPageIndex(index)}
        onPrev={() => table.previousPage()}
        onNext={() => table.nextPage()}
        onPageSizeChange={(size) => table.setPageSize(size)}
        hidden={totalOnly}
      />
    </nav>
  );
}
