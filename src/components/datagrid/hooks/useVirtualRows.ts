import type { Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useMemo, type RefObject } from "react";
import { useElementHeight } from "./useElementHeight";
import type { GroupBucket } from "../types/grouping";

/**
 * One flat list so a single virtualizer covers both grouped and ungrouped bodies.
 * Grouped: a header item per bucket, followed by that bucket's rows unless collapsed.
 */
export type BodyItem<TRow extends object> =
  | { kind: "group"; group: GroupBucket<Row<TRow>> }
  | { kind: "row"; row: Row<TRow> };

/** The table body's virtualization: the flat item list, the window, the paddings. */
export function useVirtualRows<TRow extends object>({
  allRows,
  groups,
  collapsedGroups,
  scrollRef,
}: {
  allRows: Row<TRow>[];
  groups?: GroupBucket<Row<TRow>>[];
  collapsedGroups?: ReadonlySet<string>;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const items = useMemo<BodyItem<TRow>[]>(() => {
    if (!groups) return allRows.map((row) => ({ kind: "row" as const, row }));
    const out: BodyItem<TRow>[] = [];
    for (const group of groups) {
      out.push({ kind: "group", group });
      if (!collapsedGroups?.has(group.key)) {
        for (const row of group.rows) out.push({ kind: "row", row });
      }
    }
    return out;
  }, [groups, collapsedGroups, allRows]);

  /*
   * The scroll element is the wrapper div, but the virtualized rows start AFTER the sticky
   * `<thead>`, so every offset the virtualizer computes is shifted by the header's height.
   * `scrollMargin` corrects it. Measure the header rather than hard-coding a height — the
   * filter row toggles, and a wrong margin only shows as a subtly misplaced window that
   * `overscan` hides.
   */
  const { ref: headRef, height: headerHeight } =
    useElementHeight<HTMLTableSectionElement>();

  /* Measured heights are cached per key. Keyed by index, a row taller than the estimate
     (open detail panel, inline editor) leaves its height behind at that index when a
     node or a group above it opens or closes. Stable identity: the virtualizer
     recomputes every measurement when this function changes. */
  const getItemKey = useCallback(
    (i: number) => {
      const item = items[i];
      if (!item) return i;
      return item.kind === "group" ? `g:${item.group.key}` : `r:${item.row.id}`;
    },
    [items]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is compiler-incompatible by design; skipping memoization here is the intended behavior.
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    getItemKey,
    // Spec heights: 40px data rows, 36px group headers.
    estimateSize: (i) => (items[i]?.kind === "group" ? 36 : 40),
    overscan: 10,
    scrollMargin: headerHeight,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  // getTotalSize() already nets out scrollMargin; `start`/`end` do not, so the padding
  // rows — which live in normal flow below the header — have to subtract it themselves.
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop =
    virtualItems.length > 0 ? virtualItems[0].start - headerHeight : 0;

  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - (virtualItems[virtualItems.length - 1].end - headerHeight)
      : 0;

  return {
    items,
    virtualItems,
    paddingTop,
    paddingBottom,
    measureElement: rowVirtualizer.measureElement,
    headRef,
  };
}
