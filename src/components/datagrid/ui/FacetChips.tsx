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

/** Active-criteria bar under the toolbar: one chip per search/filter, each clearable. */
export function FacetChips({ chips }: { chips: FacetChip[] }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border-default px-3.5 py-2">
      {chips.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center overflow-hidden rounded-full border border-border-default bg-surface-card text-[.6875rem]"
        >
          <span className="bg-accent-subtle px-2 py-0.5 font-semibold uppercase tracking-[.04em] text-accent">
            {c.label}
          </span>
          <span className="max-w-40 truncate px-2 py-0.5 text-body">{c.value}</span>
          <button
            type="button"
            onClick={c.onClear}
            aria-label={`Clear ${c.label} filter`}
            className="cursor-pointer px-1.5 py-0.5 text-faint transition-colors hover:text-danger"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}
