/**
 * `.og-sel` — the "N selected" pill. An accent *tint*, not a solid accent fill: it sits
 * in the footer next to muted body text, and a saturated block there reads as a primary
 * action rather than a status.
 *
 * Shared by the pager footer and the cards-view footer so the two can't drift.
 */
export function SelectionPill({
  count,
  onClear,
}: {
  count: number;
  onClear?: () => void;
}) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-accent-subtle py-0.5 pl-2.5 pr-1 font-semibold text-accent">
      {count} selected
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer rounded-full px-1.5 py-0.5 text-[.75rem] outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--rui-accent)_18%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
        >
          Clear
        </button>
      )}
    </span>
  );
}
