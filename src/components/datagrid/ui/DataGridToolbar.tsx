import { Funnel, LayoutGrid, List, Plus, RefreshCw, Search, X } from "lucide-react";
import { memo, useEffect, useState } from "react";

export type GridView = "list" | "cards";

type DataGridToolbarProps = {
  title: string;
  subtitle?: string;
  /** Row count shown in the pill next to the title. */
  count?: number;
  toolbar?: React.ReactNode;
  editContainer?: "right" | "bottom" | "modal" | "inline" | "none";
  error: string | Error | null;
  onAddClick: () => void;
  onRetry?: () => void | Promise<void>;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  /** Whether any column declares filter meta — hides the Filters toggle when none do. */
  hasFilterableColumns?: boolean;
  filtersShown?: boolean;
  activeFilterCount?: number;
  onToggleFilters?: () => void;
  /** Rendered only when the consumer supplies a `card` renderer. */
  view?: GridView;
  onViewChange?: (v: GridView) => void;
};

export const DataGridToolbar = memo(function DataGridToolbar({
  title,
  subtitle,
  count,
  toolbar,
  editContainer = "right",
  error,
  onAddClick,
  onRetry,
  searchable,
  searchValue = "",
  onSearchChange,
  hasFilterableColumns,
  filtersShown,
  activeFilterCount = 0,
  onToggleFilters,
  view,
  onViewChange,
}: DataGridToolbarProps) {
  /*
   * Dismissal is tracked by message rather than by a boolean reset from an effect.
   * Keying on the Error object's identity meant a parent that rebuilt its error on every
   * render un-dismissed the banner immediately; keying on the text means a genuinely new
   * error re-opens it and the same one stays closed. No effect needed.
   */
  const errorMessage =
    error == null ? null : typeof error === "string" ? error : error.message;
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const showError = errorMessage !== null && errorMessage !== dismissedMessage;

  return (
    <>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border-default px-3.5 py-[11px]">
        {/* Title block: title + count pill + subtitle */}
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="whitespace-nowrap text-[.9375rem] font-semibold text-body">
            {title}
          </h2>
          {typeof count === "number" && (
            <span className="rounded-full bg-surface-inset px-2 py-0.5 font-mono text-[.6875rem] leading-none text-muted">
              {count}
            </span>
          )}
          {subtitle && (
            <span className="min-w-0 truncate text-xs text-faint">{subtitle}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}

          {searchable && onSearchChange && (
            <SearchBox value={searchValue} onChange={onSearchChange} />
          )}

          {hasFilterableColumns && onToggleFilters && (
            <button
              type="button"
              onClick={onToggleFilters}
              aria-pressed={filtersShown}
              className={[
                "flex h-[30px] cursor-pointer items-center gap-1.5 rounded-control border px-2.5 text-[.8125rem] outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]",
                filtersShown
                  ? "border-accent/40 bg-accent-subtle font-semibold text-accent"
                  : "border-border-default text-muted hover:border-accent hover:text-body",
              ].join(" ")}
            >
              <Funnel className="h-3.5 w-3.5" aria-hidden />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-accent px-1.5 font-mono text-[.6875rem] font-semibold leading-4 text-accent-contrast">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {view && onViewChange && (
            <div
              role="group"
              aria-label="View"
              className="inline-flex overflow-hidden rounded-control border border-border-default"
            >
              {([
                { id: "list" as const, Icon: List, label: "List view" },
                { id: "cards" as const, Icon: LayoutGrid, label: "Cards view" },
              ]).map(({ id, Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onViewChange(id)}
                  aria-label={label}
                  aria-pressed={view === id}
                  title={label}
                  className={`grid h-[30px] w-[30px] cursor-pointer place-items-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] ${
                    view === id
                      ? "bg-accent-subtle text-accent"
                      : "text-muted hover:bg-surface-inset hover:text-body"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </button>
              ))}
            </div>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              aria-label="Refresh"
              title="Refresh"
              className="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-control border border-border-default text-muted outline-none transition-colors hover:border-accent hover:text-body focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}

          {editContainer !== "none" && (
            <button
              onClick={onAddClick}
              /* Tied to the visible banner, not to `error` — dismissing the banner used
                 to leave Add disabled forever. */
              disabled={showError}
              className="inline-flex h-[30px] cursor-pointer select-none items-center gap-1.5 rounded-control bg-accent px-3 text-[.8125rem] font-medium text-accent-contrast shadow-sm transition-all hover:bg-accent-hover hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}
        </div>
      </div>

      {showError && (
        <div
          className="mx-3 mt-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
          role="alert"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">{errorMessage}</span>
            <div className="flex shrink-0 items-center gap-1">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="rounded border border-danger/40 bg-surface-card px-2 py-1 text-xs font-medium text-danger hover:bg-danger/20"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => setDismissedMessage(errorMessage)}
                className="rounded p-1 text-danger transition-colors hover:bg-danger/20"
                aria-label="Dismiss error"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

/**
 * Search input, 30px per spec, with a short local debounce. External resets (e.g. the
 * facet chip's ×) are reconciled during render, same pattern as HeaderFilter.
 */
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [input, setInput] = useState(value);
  const [lastExternal, setLastExternal] = useState(value);
  if (value !== lastExternal) {
    setLastExternal(value);
    setInput(value);
  }

  useEffect(() => {
    if (input === value) return;
    const id = setTimeout(() => onChange(input), 200);
    return () => clearTimeout(id);
  }, [input, value, onChange]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
        aria-hidden
      />
      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search…"
        aria-label="Search all columns"
        className="h-[30px] w-40 rounded-control border border-border-default bg-surface-inset pl-7 pr-2 text-[.8125rem] text-body outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-[var(--rui-focus-ring)] md:w-48"
      />
    </div>
  );
}
