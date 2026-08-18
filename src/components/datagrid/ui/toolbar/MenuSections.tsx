import { Check, Funnel, FunnelX, Rows3 } from "lucide-react";

import { useRovingRadios } from "../../hooks/useRovingRadios";
import { MENU_ITEM } from "../toolbarStyles";

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

/**
 * The overflow menu's Filter column: the filter-row toggle, and the way out of several
 * active criteria at once.
 */
export function FilterSection({
  filtersShown,
  activeFilterCount,
  onToggleFilters,
  onClearFilters,
}: {
  filtersShown?: boolean;
  activeFilterCount: number;
  onToggleFilters: () => void;
  onClearFilters?: () => void;
}) {
  return (
    <section aria-label="Filter">
      <SectionHead Icon={Funnel}>Filter</SectionHead>
      {/*
       * A switch, not a command: it has an on/off state the user has to be able to read
       * at a glance. `aria-pressed` alone is invisible, so the row carries a
       * track-and-knob and says which state it is in.
       *
       * Applying a criterion leaves the menu open, so several can be set in one visit.
       * Only Escape, an outside click, or a one-shot command closes it.
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
            filtersShown ? "bg-accent" : "bg-surface-inset border border-border-default"
          }`}
        >
          <span
            className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full transition-all ${
              filtersShown ? "left-[11px] bg-accent-contrast" : "left-0.5 bg-faint"
            }`}
          />
        </span>
      </button>

      {/* Clearing one criterion is the pill's ×; this is the way out of five of them,
          and it only exists while there is something to clear. */}
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
  );
}

/** The overflow menu's Group by column: one radio per grouping key, plus None. */
export function GroupBySection({
  options,
  groupBy,
  onGroupByChange,
  bordered,
}: {
  options: { key: string; label: string }[];
  groupBy: string;
  onGroupByChange: (key: string) => void;
  /** Set when the Filter column is beside it, to draw the divider between the two. */
  bordered: boolean;
}) {
  const opts = [{ key: "", label: "None" }, ...options];
  const { tabStopIndex, handleArrowKey } = useRovingRadios(
    opts.map((g) => g.key),
    groupBy,
    onGroupByChange
  );

  return (
    <section
      aria-label="Group by"
      className={bordered ? "border-l border-border-default pl-1.5" : ""}
    >
      <SectionHead Icon={Rows3}>Group by</SectionHead>
      <div
        role="radiogroup"
        aria-label="Group by"
        className="max-h-[220px] overflow-y-auto scrollbar"
      >
        {opts.map((g, i) => {
          const active = groupBy === g.key;
          return (
            <button
              key={g.key || "__none__"}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={i === tabStopIndex ? 0 : -1}
              onClick={() => onGroupByChange(g.key)}
              onKeyDown={handleArrowKey}
              className={`${MENU_ITEM} ${active ? "text-accent" : ""}`}
            >
              <span className="min-w-0 flex-1 truncate">{g.label}</span>
              {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
