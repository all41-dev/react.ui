/**
 * One active search criterion — a column filter or the group-by — rendered as a pill
 * inside the search bar.
 *
 * The global search term is deliberately NOT a facet: the search input shows it already,
 * and now that the pills live in that same control a pill would just duplicate it.
 */
export type FacetChip = {
  /** Stable identity for the criterion: the column id, or "__group__". */
  id: string;
  /** Key segment, e.g. the column label. */
  label: string;
  /** Human-readable value of the criterion. */
  value: string;
  onClear: () => void;
};
