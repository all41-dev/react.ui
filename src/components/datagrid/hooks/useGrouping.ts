import type { Row, Table } from "@tanstack/react-table";
import { useMemo } from "react";
import type { ColumnMeta } from "../types/column";
import { EMPTY_GROUP_LABEL, type GroupBucket, type GroupOption } from "../types/grouping";

/** Column ids declaring `agg: "sum"`, in visible order. */
export function useAggColumnIds<TRow extends object>(table: Table<TRow>): string[] {
  const leaf = table.getVisibleLeafColumns();
  return useMemo(
    () =>
      leaf
        .filter(
          (c) => ((c.columnDef as { meta?: ColumnMeta<any, any> }).meta?.agg) === "sum"
        )
        .map((c) => c.id),
    [leaf]
  );
}

function readValue<TRow>(row: Row<TRow>, key: string): unknown {
  // Prefer the table's accessor (respects accessorFn); fall back to the raw object so
  // grouping still works on a key that isn't a declared column.
  try {
    const v = row.getValue(key);
    if (v !== undefined) return v;
  } catch {
    /* not a known column id */
  }
  return (row.original as Record<string, unknown>)?.[key];
}

/**
 * Partitions already-filtered-and-sorted rows into groups, computing `agg:"sum"` totals
 * per group. Row order inside each bucket is the incoming sort order, so sorting applies
 * within groups exactly as it does ungrouped.
 */
export function useGroupBuckets<TRow extends object>(
  rows: Row<TRow>[],
  option: GroupOption | undefined,
  aggColumnIds: string[]
): GroupBucket<Row<TRow>>[] | undefined {
  return useMemo(() => {
    if (!option) return undefined;

    const byKey = new Map<string, Row<TRow>[]>();
    for (const row of rows) {
      const raw = readValue(row, option.key);
      const key =
        raw === null || raw === undefined || raw === ""
          ? EMPTY_GROUP_LABEL
          : String(raw);
      const bucket = byKey.get(key);
      if (bucket) bucket.push(row);
      else byKey.set(key, [row]);
    }

    // Declared values fix the order (and may include empty buckets); otherwise derive
    // from the data and sort, keeping the "—" bucket last.
    const orderedKeys = option.values
      ? option.values.map((v) => v.value)
      : [...byKey.keys()].sort((a, b) => {
          if (a === EMPTY_GROUP_LABEL) return 1;
          if (b === EMPTY_GROUP_LABEL) return -1;
          const na = Number(a);
          const nb = Number(b);
          if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
          // Runtime locale — hardcoding one bakes a single language's collation
          // into a published library component.
          return a.localeCompare(b);
        });

    const declared = new Map(option.values?.map((v) => [v.value, v]));
    const keys = option.values
      ? // Values not covered by the declared list must still be reachable.
        [...orderedKeys, ...[...byKey.keys()].filter((k) => !declared.has(k))]
      : orderedKeys;

    const out: GroupBucket<Row<TRow>>[] = [];
    for (const key of keys) {
      const bucketRows = byKey.get(key) ?? [];
      if (bucketRows.length === 0 && !declared.has(key)) continue;

      const sums: Record<string, number> = {};
      for (const colId of aggColumnIds) {
        let total = 0;
        for (const row of bucketRows) {
          const n = Number(readValue(row, colId));
          if (!Number.isNaN(n)) total += n;
        }
        sums[colId] = total;
      }

      const meta = declared.get(key);
      out.push({
        key,
        label: meta?.label ?? key,
        color: meta?.color,
        rows: bucketRows,
        sums,
      });
    }
    return out;
  }, [rows, option, aggColumnIds]);
}
