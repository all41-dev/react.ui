import { useId, useRef, useState } from "react";

import { useAnchoredPanel } from "../hooks/useAnchoredPanel";
import { useOutsideDismiss } from "../hooks/useOutsideDismiss";
import { MenuCommandsRow } from "./toolbar/MenuCommandsRow";
import { FilterSection, GroupBySection } from "./toolbar/MenuSections";
import { OverflowTrigger } from "./toolbar/OverflowTrigger";
import { hasOverflowItems, type OverflowMenuProps } from "./toolbar/overflowItems";

const WIDE_WIDTH = 400;
const NARROW_WIDTH = 236;
/** Filter switch, a capped group list and the bottom row — enough to pick a side. */
const PANEL_EST_HEIGHT = 300;
/** The two-column layout runs taller: the capped group list plus headings and the
    commands row stack to ~350, and a flip decision made on 300 picks the wrong side. */
const PANEL_EST_HEIGHT_WIDE = 350;

/**
 * The search bar's dropdown: everything that narrows the data, plus the two view commands.
 *
 * Laid out the way Odoo lays out its control panel — **Filter** and **Group by** side by
 * side under their own headings, so you read the panel by what a thing does rather than
 * down one undifferentiated list. What changes the query sits above the rule; what changes
 * the view (Columns, Refresh) sits below it.
 *
 * Deliberately not `role="menu"`: the Columns row opens a dialog rather than performing a
 * command, and menu semantics would promise arrow-key command navigation this doesn't have.
 */
export function ToolbarOverflowMenu({
  hasFilterableColumns,
  filtersShown,
  activeFilterCount = 0,
  onToggleFilters,
  onClearFilters,
  columnsControl,
  onResetView,
  viewIsDefault,
  groupOptions,
  groupBy = "",
  onGroupByChange,
  onRetry,
  attached,
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const showFilters = hasFilterableColumns && onToggleFilters;
  const showGroups = groupOptions && groupOptions.length > 0 && onGroupByChange;
  const bothColumns = !!showFilters && !!showGroups;
  const panelStyle = useAnchoredPanel(
    open,
    wrapRef,
    bothColumns ? WIDE_WIDTH : NARROW_WIDTH,
    bothColumns ? PANEL_EST_HEIGHT_WIDE : PANEL_EST_HEIGHT
  );

  useOutsideDismiss(open, wrapRef, () => setOpen(false));

  const hasAnything = hasOverflowItems({
    hasFilterableColumns,
    onToggleFilters,
    columnsControl,
    groupOptions,
    onGroupByChange,
    onRetry,
    onResetView,
  });
  if (!hasAnything) return null;

  const engaged = filtersShown || activeFilterCount > 0 || !!groupBy;

  return (
    <div
      ref={wrapRef}
      /*
       * `flex` when attached: the button matches the field's height by stretching, and
       * a block wrapper would swallow that — `align-self` does nothing outside a flex
       * container, which left the button drawn short against a field grown by pills.
       */
      className={attached ? "relative flex self-stretch" : "relative"}
    >
      <OverflowTrigger
        open={open}
        engaged={!!engaged}
        activeFilterCount={activeFilterCount}
        panelId={panelId}
        attached={attached}
        onToggle={() => setOpen((v) => !v)}
      />

      {open && (
        <div
          id={panelId}
          /* Without a role, `aria-label` on a div is dropped — a generic element exposes
             no name. `dialog` matches the trigger's `aria-haspopup` and ColumnsPopover. */
          role="dialog"
          aria-label="More options"
          /* Viewport-positioned rather than absolute — the grid root is `overflow-hidden`
             and would clip it on a short grid. See `useAnchoredPanel`. */
          style={panelStyle}
          className={[
            "z-50 rounded-surface border border-border-default",
            "bg-surface-card p-1.5 shadow-[var(--elev-3)] animate-pop-in",
            /* The scroll `useAnchoredPanel`'s maxHeight cap acts on. */
            "max-w-[calc(100vw-2rem)] overflow-y-auto scrollbar",
            bothColumns ? "w-[400px]" : "w-[236px]",
          ].join(" ")}
        >
          {(showFilters || showGroups) && (
            <div className={bothColumns ? "grid grid-cols-2 gap-x-1.5" : ""}>
              {showFilters && (
                <FilterSection
                  filtersShown={filtersShown}
                  activeFilterCount={activeFilterCount}
                  onToggleFilters={onToggleFilters}
                  onClearFilters={onClearFilters}
                />
              )}
              {showGroups && (
                <GroupBySection
                  options={groupOptions}
                  groupBy={groupBy}
                  onGroupByChange={onGroupByChange}
                  bordered={bothColumns}
                />
              )}
            </div>
          )}

          <MenuCommandsRow
            columnsControl={columnsControl}
            onResetView={onResetView}
            viewIsDefault={viewIsDefault}
            onRetry={onRetry}
            onCommandRun={() => setOpen(false)}
            divided={!!showFilters || !!showGroups}
          />
        </div>
      )}
    </div>
  );
}
