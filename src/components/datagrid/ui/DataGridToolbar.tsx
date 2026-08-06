import { LayoutGrid, List, Plus, X } from "lucide-react";
import { memo, useState } from "react";

import type { FacetChip } from "../types/facets";
import { SearchBar } from "./SearchBar";
import { hasOverflowItems, ToolbarOverflowMenu } from "./ToolbarOverflowMenu";

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
  /** Drops every column filter at once, from the menu's Filter section. */
  onClearFilters?: () => void;
  /** The Columns popover. A slot rather than props, so the toolbar stays presentational. */
  columnsControl?: React.ReactNode;
  /** Rendered only when the consumer supplies a `card` renderer. */
  view?: GridView;
  onViewChange?: (v: GridView) => void;
  /** Group-by select; rendered only when the consumer supplies `groupOptions`. */
  groupOptions?: { key: string; label: string }[];
  groupBy?: string;
  onGroupByChange?: (key: string) => void;
  /** Active filters and grouping, rendered as pills inside the search field. */
  facets?: FacetChip[];
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
  onClearFilters,
  columnsControl,
  view,
  onViewChange,
  groupOptions,
  groupBy = "",
  onGroupByChange,
  facets = [],
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

  /*
   * Search field and overflow trigger are one welded control, so the trigger has to know
   * whether the field is beside it and the field whether the trigger is. When the grid is
   * neither searchable nor carrying facets there is no field to weld to, and the trigger
   * stands alone as a normal button.
   */
  const menuShown = hasOverflowItems({
    hasFilterableColumns,
    onToggleFilters,
    columnsControl,
    groupOptions,
    onGroupByChange,
    onRetry,
  });
  const searchShown = !!(searchable && onSearchChange);
  const barShown = searchShown || facets.length > 0;

  const overflowMenu = (
    <ToolbarOverflowMenu
      hasFilterableColumns={hasFilterableColumns}
      filtersShown={filtersShown}
      activeFilterCount={activeFilterCount}
      onToggleFilters={onToggleFilters}
      onClearFilters={onClearFilters}
      columnsControl={columnsControl}
      groupOptions={groupOptions}
      groupBy={groupBy}
      onGroupByChange={onGroupByChange}
      onRetry={onRetry}
      attached={barShown}
    />
  );

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

        {/* Controls. Deliberately no `flex-wrap`: secondary controls live in the overflow
            menu precisely so this stays one line at any width. `flex-1` so the search bar
            has room to be the primary element of the row rather than a 200px afterthought. */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {toolbar}

          {barShown && (
            <SearchBar
              value={searchValue}
              onChange={onSearchChange ?? noop}
              facets={facets}
              searchable={searchShown}
              trailing={menuShown ? overflowMenu : undefined}
            />
          )}

          {view && onViewChange && (
            /* An inset trough with the active tab lifted onto the card surface, so it
               reads as one control with a current state rather than two buttons. */
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

          {/* Only stands on its own when there is no field to weld it to. */}
          {!barShown && overflowMenu}

          {editContainer !== "none" && (
            /* Flat accent fill, and no press animation — nothing else in the grid
               moves on press. */
            <button
              onClick={onAddClick}
              /* Tied to the visible banner rather than `error`, so dismissing the
                 banner re-enables Add. */
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
        /* A full-bleed band directly under the toolbar — part of the grid's chrome,
           not a floating card inset from the edges. */
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

/** The bar renders with facets but no input when the grid isn't searchable. */
function noop() {}
