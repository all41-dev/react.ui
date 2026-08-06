import { X } from "lucide-react";

export type FacetChip = {
  /** Stable identity for the criterion (column id, or "search"). */
  id: string;
  /** Uppercase key segment, e.g. the column label. */
  label: string;
  /** Human-readable value of the criterion. */
  value: string;
  onClear: () => void;
};

/**
 * `.og-facet` — active-criteria bar under the toolbar, one chip per search/filter.
 *
 * The whole chip is an accent tint on the control radius, not a neutral capsule: these
 * are the criteria narrowing what you're looking at, and they should read as one family
 * with the Filters toggle. Clearing hovers to accent, not danger — removing a filter
 * shows you *more* data, so flagging it as destructive is misleading.
 */
export function FacetChips({ chips }: { chips: FacetChip[] }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-[7px] border-b border-border-default bg-surface-card px-3.5 py-[9px]">
      {chips.map((c) => (
        <span
          key={c.id}
          className="inline-flex h-6 items-stretch overflow-hidden rounded-control border border-[color-mix(in_srgb,var(--rui-accent)_45%,transparent)] bg-accent-subtle text-[.75rem]"
        >
          <span className="flex items-center bg-[color-mix(in_srgb,var(--rui-accent)_16%,transparent)] px-[7px] text-[.625rem] font-bold uppercase tracking-[.05em] text-accent">
            {c.label}
          </span>
          <span className="flex max-w-[180px] items-center truncate px-[7px] text-body">
            {c.value}
          </span>
          <button
            type="button"
            onClick={c.onClear}
            aria-label={`Clear ${c.label} filter`}
            className="grid w-5 cursor-pointer place-items-center border-l border-[color-mix(in_srgb,var(--rui-accent)_30%,transparent)] text-muted outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--rui-accent)_16%,transparent)] hover:text-accent focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}
