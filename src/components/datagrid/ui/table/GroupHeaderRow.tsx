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
  // With no aggregates the label simply spans the whole row.
  const labelSpan = firstAggIndex === -1 ? leafColumns.length : firstAggIndex;
  const trailing = firstAggIndex === -1 ? [] : leafColumns.slice(firstAggIndex);

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
          // The row already handles the click; this keeps the control keyboard-reachable
          // without firing twice.
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          aria-expanded={!collapsed}
          className="flex cursor-pointer items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-150 ${
              collapsed ? "" : "rotate-90"
            }`}
            aria-hidden
          />
          {group.color && (
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: group.color }}
            />
          )}
          <span className="truncate text-[.8125rem] font-semibold text-body">
            {group.label}
          </span>
          <span className="rounded-full bg-surface-card px-1.5 py-0.5 font-mono text-[.6875rem] leading-none text-muted">
            {group.rows.length}
          </span>
        </button>
      </th>

      {trailing.map((c) => (
        <td
          key={c.id}
          className="border-b border-border-default px-3 text-right align-middle font-mono text-xs font-semibold text-body"
        >
          {isAgg(c) ? fmt.format(group.sums[c.id] ?? 0) : null}
        </td>
      ))}
    </tr>
  );
}
