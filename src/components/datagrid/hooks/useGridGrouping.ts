import { useCallback, useMemo, useState } from "react";
import type { Table } from "@tanstack/react-table";

import type { GroupOption } from "../types/grouping";
import { useAggColumnIds, useGroupBuckets } from "./useGrouping";

type Params<TRow extends object> = {
  table: Table<TRow>;
  groupOptions?: GroupOption[];
  defaultGroupBy?: string;
};

/** Group-by selection, per-group collapse state, and the resulting buckets. */
export function useGridGrouping<TRow extends object>({
  table,
  groupOptions,
  defaultGroupBy = "",
}: Params<TRow>) {
  const [groupBy, setGroupByState] = useState(defaultGroupBy);
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const setGroupBy = useCallback((key: string) => {
    setGroupByState(key);
    // Collapse state is keyed by group value, which means nothing once the grouping
    // criterion changes.
    setCollapsedGroups(new Set());
  }, []);

  const clearGroupBy = useCallback(() => setGroupBy(""), [setGroupBy]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const activeGroupOption = useMemo(
    () => groupOptions?.find((g) => g.key === groupBy),
    [groupOptions, groupBy]
  );

  const aggColumnIds = useAggColumnIds(table);

  /*
   * Grouping partitions the SORTED model, not `getRowModel()` — the latter is
   * page-sliced, and grouping replaces pagination. Sorting therefore still applies,
   * but within each group.
   */
  const groups = useGroupBuckets(
    table.getSortedRowModel().rows,
    activeGroupOption,
    aggColumnIds
  );

  return {
    groupBy,
    setGroupBy,
    clearGroupBy,
    collapsedGroups,
    toggleGroup,
    activeGroupOption,
    groups,
  };
}
