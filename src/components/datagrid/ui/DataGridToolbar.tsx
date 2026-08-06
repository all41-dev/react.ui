import { Funnel, LayoutGrid, List, Plus, RefreshCw, Search, X } from "lucide-react";
import { memo, useEffect, useState } from "react";

export type GridView = "list" | "cards";

/*
 * `.og-btn` — the 30px toolbar control. Transparent at rest so the toolbar reads as one
 * surface; on hover it lifts to `--surface-raised` with a translucent edge rather than
 * jumping to an accent border, which previously made every hover look like a selection.
 */
const BTN =
  "inline-flex h-[30px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-control " +
  "border px-2.5 text-[.8125rem] outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]";

const BTN_OFF =
  "border-border-default bg-transparent text-muted hover:border-border-translucent hover:bg-surface-raised hover:text-body";

const BTN_ON =
  "border-[color-mix(in_srgb,var(--rui-accent)_50%,transparent)] bg-accent-subtle font-semibold text-accent";

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
  /** Group-by select; rendered only when the consumer supplies `groupOptions`. */
  groupOptions?: { key: string; label: string }[];
  groupBy?: string;
  onGroupByChange?: (key: string) => void;
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
  groupOptions,
  groupBy = "",
  onGroupByChange,
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
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 border-b border-border-default bg-surface-card px-3.5 py-[11px]">
        {/* Title block: title + count pill + subtitle */}
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="whitespace-nowrap text-[.9375rem] font-semibold text-body">
            {title}
          </h2>
          {typeof count === "number" && (
            <span className="rounded-full bg-surface-inset px-[7px] py-px font-mono text-[.6875rem] font-semibold leading-normal text-muted">
              {count}
            </span>
          )}
          {subtitle && (
            <span className="min-w-0 truncate text-[.75rem] text-faint">{subtitle}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {toolbar}

          {searchable && onSearchChange && (
            <SearchBox value={searchValue} onChange={onSearchChange} />
          )}

          {hasFilterableColumns && onToggleFilters && (
            <button
              type="button"
              onClick={onToggleFilters}
              aria-pressed={filtersShown}
              className={[BTN, filtersShown ? BTN_ON : BTN_OFF].join(" ")}
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

          {groupOptions && groupOptions.length > 0 && onGroupByChange && (
            <label className="flex items-center gap-1.5 text-[.8125rem] text-muted">
              <span className="hidden sm:inline">Group</span>
              <select
                value={groupBy}
                onChange={(e) => onGroupByChange(e.target.value)}
                aria-label="Group by"
                className={[BTN, groupBy ? BTN_ON : BTN_OFF].join(" ")}
              >
                <option value="">None</option>
                {groupOptions.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {view && onViewChange && (
            /* `.og-seg` — an inset trough with the active tab lifted onto the card
               surface. It was a flat bordered pair, which read as two buttons rather
               than one control with a current state. */
            <div
              role="group"
              aria-label="View"
              className="inline-flex gap-0.5 rounded-control border border-border-default bg-surface-inset p-0.5"
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
                  className={`grid h-6 w-7 cursor-pointer place-items-center rounded-[5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] ${
                    view === id
                      ? "bg-surface-card text-accent shadow-[0_1px_2px_rgba(0,0,0,.18)]"
                      : "text-faint hover:text-body"
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
              className={[BTN, BTN_OFF, "!px-2.5"].join(" ")}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}

          {editContainer !== "none" && (
            /* `.og-add` — flat accent fill. The shadow and `active:scale-95` were an
               invention; nothing else in the grid moves on press. */
            <button
              onClick={onAddClick}
              /* Tied to the visible banner, not to `error` — dismissing the banner used
                 to leave Add disabled forever. */
              disabled={showError}
              className="inline-flex h-[30px] cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-control bg-accent px-3 text-[.8125rem] font-semibold text-accent-contrast outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}
        </div>
      </div>

      {showError && (
        /* `.og-err` — a full-bleed band directly under the toolbar, not a floating card
           inset from the edges. It is part of the grid's chrome stack. */
        <div
          className="flex items-center gap-2.5 border-b border-[color-mix(in_srgb,var(--rui-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--rui-danger)_12%,transparent)] px-3.5 py-[11px] text-[.8125rem] text-danger"
          role="alert"
        >
          <span className="min-w-0 flex-1 truncate">{errorMessage}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="shrink-0 cursor-pointer rounded-control border border-[color-mix(in_srgb,var(--rui-danger)_40%,transparent)] px-2 py-0.5 text-[.75rem] font-semibold text-danger transition-colors hover:bg-[color-mix(in_srgb,var(--rui-danger)_18%,transparent)]"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={() => setDismissedMessage(errorMessage)}
            className="grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded text-danger transition-colors hover:bg-[color-mix(in_srgb,var(--rui-danger)_18%,transparent)]"
            aria-label="Dismiss error"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
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

  /* `.og-search` — the focus ring belongs to the wrapper, so the icon is inside the
     highlighted field rather than sitting outside a ring drawn around the input alone. */
  return (
    <div className="flex h-[30px] min-w-0 flex-[0_1_200px] items-center gap-1.5 rounded-control border border-border-default bg-surface-inset px-[9px] text-faint transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_2px_var(--rui-focus-ring)]">
      <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search…"
        aria-label="Search all columns"
        className="w-full min-w-[60px] border-0 bg-transparent text-[.8125rem] text-body outline-none placeholder:text-faint"
      />
    </div>
  );
}
