import type { Column, Row } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import type { ColumnMeta } from "../../types/column";
import type { GroupBucket } from "../../types/grouping";

type Props<TRow extends object> = {
  group: GroupBucket<Row<TRow>>;
  /** Visible leaf columns, in render order — the sums must line up under their columns. */
  leafColumns: Column<TRow, unknown>[];
  collapsed: boolean;
  onToggle: () => void;
};

const fmt = new Intl.NumberFormat();

/**
 * 36px group header row: chevron, colour dot, label, count pill — plus each
 * `agg:"sum"` column's total, rendered in that column's own cell so it lines up
 * with the numbers below it.
 */
export function GroupHeaderRow<TRow extends object>({
  group,
  leafColumns,
  collapsed,
  onToggle,
}: Props<TRow>) {
  const isAgg = (c: Column<TRow, unknown>) =>
    ((c.columnDef as { meta?: ColumnMeta<any, any> }).meta?.agg) === "sum";

  const firstAggIndex = leafColumns.findIndex(isAgg);
  /*
   * With no aggregates the label spans the whole row. Otherwise it spans everything
   * before the first aggregate — but it always needs at least one cell of its own, so
   * when the FIRST column is an aggregate the label takes column 0 and that one sum is
   * dropped. `trailing` is sliced at `labelSpan` rather than `firstAggIndex` so the two
   * always account for exactly `leafColumns.length` cells: the old pair clamped the span
   * to 1 while still trailing EVERY column, emitting N+1 cells into an N-column table.
   */
  const labelSpan =
    firstAggIndex === -1 ? leafColumns.length : Math.max(1, firstAggIndex);
  const trailing = firstAggIndex === -1 ? [] : leafColumns.slice(labelSpan);

  return (
    <tr
      className="h-9 cursor-pointer bg-surface-inset transition-colors hover:bg-surface-raised"
      onClick={onToggle}
    >
      <th
        scope="colgroup"
        colSpan={Math.max(1, labelSpan)}
        className="border-b border-border-default px-3 text-left font-normal"
      >
        <button
          type="button"
          /* Toggles, then stops: the row's own handler would fire on the way up and
             collapse the group straight back. A native button already raises this click
             from Enter and Space, so it needs no key handler of its own — one that also
             called `onToggle` would double-toggle every keypress. */
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={!collapsed}
          /*
           * No `aria-controls`. Its target has to be a single mounted element, and this
           * group's rows are virtualized into one `<tbody>` each — non-contiguous, and
           * mostly not in the DOM at all. Pointing at ids that may not exist is worse
           * than omitting the attribute, so the name below carries the context instead:
           * "Admin, 3 rows" + aria-expanded says what collapses without it.
           */
          aria-label={`${group.label}, ${group.rows.length} ${
            group.rows.length === 1 ? "row" : "rows"
          }`}
          className="flex cursor-pointer items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
        >
          {/* The chevron takes the accent when open — it is the one moving part that
              says the group is expanded. */}
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 transition-[transform,color] duration-150 ${
              collapsed ? "text-faint" : "rotate-90 text-accent"
            }`}
            aria-hidden
          />
          {group.color && (
            <span
              aria-hidden
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: group.color }}
            />
          )}
          <span className="truncate text-[.8125rem] font-semibold text-body">
            {group.label}
          </span>
          <span className="rounded-full bg-surface-card px-[7px] py-px font-mono text-[.6875rem] font-semibold leading-normal text-muted">
            {group.rows.length}
          </span>
        </button>
      </th>

      {trailing.map((c) => (
        /* A muted mono total. Deliberately understated — a bold weight would claim
           more than a flat per-group sum does. */
        <td
          key={c.id}
          className="border-b border-border-default px-3 text-right align-middle font-mono text-[.75rem] text-muted"
        >
          {isAgg(c) ? fmt.format(group.sums[c.id] ?? 0) : null}
        </td>
      ))}
    </tr>
  );
}
