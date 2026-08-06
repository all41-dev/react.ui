import { Check, ChevronDown, Funnel, FunnelX, RefreshCw, Rows3 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { BTN, BTN_OFF, BTN_ON, MENU_ITEM } from "./toolbarStyles";

type Props = {
  hasFilterableColumns?: boolean;
  filtersShown?: boolean;
  activeFilterCount?: number;
  onToggleFilters?: () => void;
  /** Drops every column filter at once. Rendered only while some are active. */
  onClearFilters?: () => void;
  /** The Columns popover, rendered as a row. It owns its own trigger and panel. */
  columnsControl?: React.ReactNode;
  groupOptions?: { key: string; label: string }[];
  groupBy?: string;
  onGroupByChange?: (key: string) => void;
  onRetry?: () => void | Promise<void>;
  /** Welded to the right edge of the search field: square left corners, shared border. */
  attached?: boolean;
};

/**
 * Whether the menu has anything to show. Exported because the search bar has to square
 * off its right edge only when a trigger is actually welded to it — asking here keeps
 * that decision in one place instead of letting the two copies drift.
 */
export function hasOverflowItems({
  hasFilterableColumns,
  onToggleFilters,
  columnsControl,
  groupOptions,
  onGroupByChange,
  onRetry,
}: Props): boolean {
  return !!(
    (hasFilterableColumns && onToggleFilters) ||
    (groupOptions && groupOptions.length > 0 && onGroupByChange) ||
    columnsControl ||
    onRetry
  );
}

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
  groupOptions,
  groupBy = "",
  onGroupByChange,
  onRetry,
  attached,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const showFilters = hasFilterableColumns && onToggleFilters;
  const showGroups = groupOptions && groupOptions.length > 0 && onGroupByChange;
  const hasAnything = hasOverflowItems({
    hasFilterableColumns,
    onToggleFilters,
    columnsControl,
    groupOptions,
    onGroupByChange,
    onRetry,
  });

  /*
   * Closing on outside pointerdown, matching ColumnsPopover. A click inside the panel —
   * including anywhere in the nested Columns popover — is inside this wrapper, so opening
   * that popover does not dismiss the panel underneath it.
   */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!hasAnything) return null;

  const engaged = filtersShown || activeFilterCount > 0 || !!groupBy;
  const bothColumns = !!showFilters && !!showGroups;

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? panelId : undefined}
        aria-label="Filters, columns and grouping"
        title="Filters, columns and grouping"
        className={[
          BTN,
          engaged || open ? BTN_ON : BTN_OFF,
          attached ? "h-auto self-stretch rounded-l-none" : "",
        ].join(" ")}
      >
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-accent px-1.5 font-mono text-[.6875rem] font-semibold leading-4 text-accent-contrast">
            {activeFilterCount}
          </span>
        )}
        {/* A caret, not an ellipsis: this opens a panel attached to the field, and the
            rotation says which way it is. An ellipsis promises a loose list of commands. */}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={panelId}
          aria-label="More options"
          className={[
            "absolute right-0 top-[calc(100%+6px)] z-50 rounded-surface border border-border-default",
            "bg-surface-card p-1.5 shadow-[var(--elev-3)] animate-pop-in",
            "max-w-[calc(100vw-2rem)]",
            bothColumns ? "w-[400px]" : "w-[236px]",
          ].join(" ")}
        >
          {(showFilters || showGroups) && (
            <div className={bothColumns ? "grid grid-cols-2 gap-x-1.5" : ""}>
              {showFilters && (
                <section aria-label="Filter">
                  <SectionHead Icon={Funnel}>Filter</SectionHead>
                  {/*
                   * A switch, not a command: it has an on/off state the user has to be
                   * able to read at a glance. `aria-pressed` alone is invisible, so the
                   * row carries a track-and-knob and says which state it is in.
                   *
                   * Stays open. Applying three criteria used to mean opening this menu
                   * three times; only Escape, an outside click, or a one-shot command
                   * closes it.
                   */}
                  <button
                    type="button"
                    onClick={onToggleFilters}
                    role="switch"
                    aria-checked={!!filtersShown}
                    className={`${MENU_ITEM} ${filtersShown ? "text-accent" : ""}`}
                  >
                    <span className="flex-1">
                      Filter row
                      <span className="ml-1.5 text-[.6875rem] text-faint">
                        {filtersShown ? "shown" : "hidden"}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={`relative h-3.5 w-6 shrink-0 rounded-full transition-colors ${
                        filtersShown
                          ? "bg-accent"
                          : "bg-surface-inset border border-border-default"
                      }`}
                    >
                      <span
                        className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-all ${
                          filtersShown ? "left-[11px] bg-accent-contrast" : "left-0.5 bg-faint"
                        }`}
                      />
                    </span>
                  </button>

                  {/* Clearing one criterion is the pill's ×; this is the way out of five
                      of them, and it only exists while there is something to clear. */}
                  {activeFilterCount > 0 && onClearFilters && (
                    <button type="button" onClick={onClearFilters} className={MENU_ITEM}>
                      <FunnelX className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                      <span className="flex-1">Clear all</span>
                      <span className="rounded-full bg-accent px-1.5 font-mono text-[.6875rem] font-semibold leading-4 text-accent-contrast">
                        {activeFilterCount}
                      </span>
                    </button>
                  )}
                </section>
              )}

              {showGroups && (
                <section
                  aria-label="Group by"
                  className={bothColumns ? "border-l border-border-default pl-1.5" : ""}
                >
                  <SectionHead Icon={Rows3}>Group by</SectionHead>
                  <div
                    role="radiogroup"
                    aria-label="Group by"
                    className="max-h-[220px] overflow-y-auto scrollbar"
                  >
                    {[{ key: "", label: "None" }, ...groupOptions].map((g) => {
                      const active = groupBy === g.key;
                      return (
                        <button
                          key={g.key || "__none__"}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => onGroupByChange(g.key)}
                          className={`${MENU_ITEM} ${active ? "text-accent" : ""}`}
                        >
                          <span className="min-w-0 flex-1 truncate">{g.label}</span>
                          {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {(columnsControl || onRetry) && (
            /* Below the rule: what changes the view rather than the query. */
            <div
              className={[
                "flex items-center gap-1",
                showFilters || showGroups
                  ? "mt-1.5 border-t border-border-default pt-1.5"
                  : "",
              ].join(" ")}
            >
              {/* Left as its own control: it opens a dialog rather than running a command,
                  so the panel stays open behind it. Its wrapper is forced back to `static`
                  so the popover anchors to this panel and opens below it, instead of
                  landing on top of the rows underneath. */}
              {columnsControl && (
                <div
                  /* The trigger hides its label under `sm`; in here it always has room. */
                  className="min-w-0 flex-1 [&>div]:!static [&>div>button]:!h-auto [&>div>button]:w-full [&>div>button]:justify-start [&>div>button]:!border-transparent [&>div>button]:!bg-transparent [&>div>button]:!py-1.5 [&>div>button]:!font-normal [&>div>button]:!text-body [&>div>button:hover]:!bg-surface-inset [&>div>button>span:first-of-type]:!inline"
                >
                  {columnsControl}
                </div>
              )}

              {onRetry && (
                <button
                  type="button"
                  onClick={() => {
                    void onRetry();
                    setOpen(false);
                  }}
                  className={`${MENU_ITEM} ${columnsControl ? "flex-1" : ""}`}
                >
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
                  <span className="flex-1">Refresh</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Odoo-style column heading: says what the group of rows below it does. */
function SectionHead({
  Icon,
  children,
}: {
  Icon: typeof Funnel;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 pb-1 pt-0.5 text-[.625rem] font-bold uppercase tracking-[.07em] text-faint">
      <Icon className="h-3 w-3" aria-hidden />
      {children}
    </div>
  );
}
