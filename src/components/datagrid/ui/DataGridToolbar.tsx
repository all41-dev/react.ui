import { Plus } from "lucide-react";
import { memo, useState } from "react";

import type { DataGridToolbarProps, GridView } from "../types/toolbar";
import { SearchBar } from "./SearchBar";
import { hasOverflowItems } from "./toolbar/overflowItems";
import {
  ToolbarErrorBanner,
  ToolbarTitle,
  ViewSwitch,
} from "./toolbar/ToolbarParts";
import { ToolbarOverflowMenu } from "./ToolbarOverflowMenu";

export type { GridView };

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
  onResetView,
  viewIsDefault,
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
    onResetView,
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
      onResetView={onResetView}
      viewIsDefault={viewIsDefault}
      groupOptions={groupOptions}
      groupBy={groupBy}
      onGroupByChange={onGroupByChange}
      onRetry={onRetry}
      attached={barShown}
    />
  );

  return (
    <>
      {/* `z-20`, not `z-10`: the toolbar's popovers escape the grid's `overflow-hidden`
          with fixed positioning, but they still paint inside this stacking context — at
          `z-10` the sticky footer, being a later sibling at the same level, drew over
          them. */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2.5 border-b border-border-default bg-surface-card px-3.5 py-[11px]">
        <ToolbarTitle title={title} subtitle={subtitle} count={count} />

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
            <ViewSwitch view={view} onViewChange={onViewChange} />
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
        <ToolbarErrorBanner
          message={errorMessage}
          onRetry={onRetry}
          onDismiss={() => setDismissedMessage(errorMessage)}
        />
      )}
    </>
  );
});

/** The bar renders with facets but no input when the grid isn't searchable. */
function noop() {}
