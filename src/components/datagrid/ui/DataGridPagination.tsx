import type { Table, TableState } from "@tanstack/react-table";
import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props<TRow extends object> = {
  table: Table<TRow>;
  totalCount?: number;
  pageSizeOptions?: number[];
  className?: string;
  sticky?: boolean;
  /** Not read directly — passing table.getState() busts the memo when table state changes. */
  tableState?: TableState;
};

/**
 * Windowed page list per the design spec: first, last, current ±1, with ellipsis
 * filling the gaps. Short totals render every page.
 */
function pageWindow(current: number, total: number): (number | "ellipsis-l" | "ellipsis-r")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "ellipsis-l" | "ellipsis-r")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push(p < current ? "ellipsis-l" : "ellipsis-r");
    out.push(p);
    prev = p;
  }
  return out;
}

export const DataGridPagination = memo(function DataGridPagination<TRow extends object>({
  table,
  totalCount,
  pageSizeOptions = [10, 20, 50, 100],
  className = "",
  sticky = true,
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

  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  const current = pageIndex + 1;
  const from = filteredTotal === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(current * pageSize, filteredTotal);
  const rangeMsg = filteredTotal === 0 ? "No results" : `${from}–${to} of ${filteredTotal}`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Never steal keys from the page-size select (or any future form control here) —
    // arrow keys inside it must change the selection, not the page. (#15)
    const t = e.target as HTMLElement;
    if (t.closest("select, input, textarea")) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (e.shiftKey) table.setPageIndex(0);
      else table.previousPage();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (e.shiftKey) table.setPageIndex(Math.max(0, pageCount - 1));
      else table.nextPage();
    }
    if (e.key === "Home") {
      e.preventDefault();
      table.setPageIndex(0);
    }
    if (e.key === "End") {
      e.preventDefault();
      table.setPageIndex(Math.max(0, pageCount - 1));
    }
  };

  return (
    <nav
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="Pagination"
      className={[
        "bg-surface-card border-t border-border-default px-3.5 py-2",
        "flex flex-wrap items-center justify-between gap-2",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]",
        sticky ? "sticky bottom-0 z-10" : "",
        className,
      ].join(" ")}
    >
      {/* LEFT: range of the FILTERED set */}
      <span aria-live="polite" className="text-xs text-muted">
        {rangeMsg}
      </span>

      {/* RIGHT: page size + windowed pages */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted">
          Rows
          <select
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="h-[26px] cursor-pointer rounded-control border border-border-default bg-surface-card px-1.5 text-xs text-body outline-none focus:border-accent focus:ring-2 focus:ring-[var(--rui-focus-ring)]"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-0.5">
          <PagerButton label="Previous page" onClick={() => table.previousPage()} disabled={!canPrev}>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </PagerButton>

          {pageCount > 0 &&
            pageWindow(current, pageCount).map((p) =>
              typeof p === "number" ? (
                <button
                  key={p}
                  type="button"
                  onClick={() => table.setPageIndex(p - 1)}
                  aria-label={`Page ${p}`}
                  aria-current={p === current ? "page" : undefined}
                  className={[
                    "h-[26px] min-w-[26px] cursor-pointer rounded-control px-1.5 text-xs outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]",
                    p === current
                      ? "bg-accent font-semibold text-accent-contrast"
                      : "text-muted hover:bg-surface-inset hover:text-body",
                  ].join(" ")}
                >
                  {p}
                </button>
              ) : (
                <span key={p} aria-hidden className="px-1 text-xs text-faint">
                  …
                </span>
              )
            )}

          <PagerButton label="Next page" onClick={() => table.nextPage()} disabled={!canNext}>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </PagerButton>
        </div>
      </div>
    </nav>
  );
}) as <TRow extends object>(props: Props<TRow>) => React.ReactElement;

function PagerButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-[26px] w-[26px] cursor-pointer place-items-center rounded-control text-muted outline-none transition-colors hover:bg-surface-inset hover:text-body focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
