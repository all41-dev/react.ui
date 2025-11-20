import type { Table, TableState } from "@tanstack/react-table";
import { useEffect, useRef, useState, memo } from "react";

type Props<TRow extends object> = {
  table: Table<TRow>;
  totalCount?: number;
  pageSizeOptions?: number[];
  className?: string;
  sticky?: boolean;
  tableState?: TableState;
};

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

  const rawCount = table.getPageCount();
  const pageCount = Number.isFinite(rawCount)
    ? rawCount
    : typeof totalCount === "number" && totalCount >= 0
    ? Math.max(1, Math.ceil(totalCount / pageSize))
    : 0;

  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  const filteredTotal =
    typeof totalCount === "number" ? totalCount : table.getFilteredRowModel().rows.length;

  const from = pageCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, filteredTotal);

  const liveMsg = pageCount === 0 ? "No results" : `${from} to ${to}`;

  const navRef = useRef<HTMLElement>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
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
    if (e.key.toLowerCase() === "home") {
      e.preventDefault();
      table.setPageIndex(0);
    }
    if (e.key.toLowerCase() === "end") {
      e.preventDefault();
      table.setPageIndex(Math.max(0, pageCount - 1));
    }
  };

  return (
    <nav
      ref={navRef}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="Pagination"
      className={[
        "bg-white border-t p-3",
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
        sticky ? "sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]" : "",
        className,
      ].join(" ")}
    >
      {/* LEFT: status */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span aria-live="polite">{liveMsg}</span>
      </div>

      {/* RIGHT: controls */}
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
        {/* Segmented page size */}
        <Segmented
          label="Rows"
          value={String(pageSize)}
          onChange={(v) => table.setPageSize(Number(v))}
          options={pageSizeOptions.map((n) => ({ label: String(n), value: String(n) }))}
        />

        <div className="flex items-center gap-1">
          <IconButton
            label="First page"
            onClick={() => table.setPageIndex(0)}
            disabled={!canPrev}
          >
            «
          </IconButton>
          <IconButton
            label="Previous page"
            onClick={() => table.previousPage()}
            disabled={!canPrev}
          >
            ‹
          </IconButton>

          <PageIndicator
            current={pageCount === 0 ? 0 : pageIndex + 1}
            total={pageCount}
            onSubmit={(n) => table.setPageIndex(Math.max(0, Math.min(n - 1, pageCount - 1)))}
          />

          <IconButton label="Next page" onClick={() => table.nextPage()} disabled={!canNext}>
            ›
          </IconButton>
          <IconButton
            label="Last page"
            onClick={() => table.setPageIndex(Math.max(0, pageCount - 1))}
            disabled={!canNext}
          >
            »
          </IconButton>
        </div>
      </div>
    </nav>
  );
}) as <TRow extends object>(props: Props<TRow>) => React.ReactElement;

/* —— UI bits —— */

function IconButton({
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
      className="h-8 w-8 rounded-lg border border-gray-300 text-sm outline-none transition hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-gray-300 cursor-pointer"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
        {options.map((o, i) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={[
                "px-3 h-8 text-sm outline-none transition cursor-pointer",
                active ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50",
                i !== options.length - 1 ? "border-r border-gray-300" : "",
                "focus-visible:ring-2 focus-visible:ring-gray-300",
              ].join(" ")}
              aria-pressed={active}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** “X / Y” with quick edit (fixed: submit vs blur) */
function PageIndicator({
  current,
  total,
  onSubmit,
}: {
  current: number;
  total: number;
  onSubmit: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(current));
  useEffect(() => setVal(String(current)), [current]);

  if (total <= 1) {
    return (
      <span className="px-2 text-sm text-gray-700">
        Page <span className="font-medium">{total === 0 ? 0 : 1}</span> /{" "}
        <span className="font-medium">{total}</span>
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="px-2 h-8 rounded-lg border border-transparent text-sm text-gray-700 hover:border-gray-300 cursor-pointer"
        title="Click to jump to page"
        aria-label={`Page ${current} of ${total}. Click to edit.`}
      >
        Page <span className="font-medium">{current}</span> /{" "}
        <span className="font-medium">{total}</span>
      </button>
    );
  }

  // — Editing mode —
  const doSubmit = () => {
    const n = Math.max(1, Math.min(Number(val) || 1, total));
    onSubmit(n);
    setEditing(false);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        doSubmit();
      }}
      className="flex items-center gap-1"
    >
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={doSubmit}                       
        min={1}
        max={total}
        inputMode="numeric"
        className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-gray-300"
        aria-label={`Go to page (1–${total})`}
      />
      <button
        type="submit"
        onMouseDown={(e) => e.preventDefault()}
        className="h-8 rounded-lg border border-gray-300 px-2 text-sm outline-none transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-300 cursor-pointer"
        aria-label="Go to page"
        title="Go to page"
      >
        Go
      </button>
    </form>
  );
}
