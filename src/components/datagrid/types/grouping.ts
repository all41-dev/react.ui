/** One selectable grouping criterion, offered in the toolbar's Group-by select. */
export type GroupOption = {
  /** Column id / accessor key to group on. */
  key: string;
  label: string;
  /**
   * Optional fixed value list. When given it drives bucket ORDER, labels and colours;
   * when omitted, buckets are derived from the data and sorted.
   */
  values?: { value: string; label: string; color?: string }[];
};

/** A materialised group: its rows plus any `agg:"sum"` totals. */
export type GroupBucket<TRow> = {
  /** Raw value as text — also the collapse-state key. */
  key: string;
  label: string;
  color?: string;
  rows: TRow[];
  /** columnId -> summed value, for columns declaring `agg: "sum"`. */
  sums: Record<string, number>;
};

export const EMPTY_GROUP_LABEL = "—";
