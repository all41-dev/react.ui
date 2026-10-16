import type { Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useMemo, type RefObject } from "react";
import { useElementHeight } from "./useElementHeight";
import type { GroupBucket } from "../types/grouping";

/**
 * One flat list so a single virtualizer covers both grouped and ungrouped bodies.
 * Grouped: a header item per bucket, followed by that bucket's rows unless collapsed.
 * Row mode adds the draft row of a create session, placed by `placeDraft`.
 */
export type BodyItem<TRow extends object> =
  | { kind: "group"; group: GroupBucket<Row<TRow>> }
  | { kind: "row"; row: Row<TRow> }
  | { kind: "draft"; parentKey?: string; depth: number };

/** Where a create session's draft row sits while the row is typed. */
export type DraftPlacement = {
  /** Tree mode: the key of the row the draft is a child of; absent for a root. */
  parentKey?: string;
  /** Tree mode places under the parent or after the last root; a flat grid puts it first. */
  tree: boolean;
};

/**
 * Inserts the draft item. In a tree it follows the parent's visible subtree, so a new
 * child reads as the last sibling, or follows the last root when no parent is named. A
 * parent not on screen (filtered out) places the draft as a root. Sorting and filters
 * are ignored on purpose: the draft must not move while its values are typed.
 */
export function placeDraft<TRow extends object>(
  items: BodyItem<TRow>[],
  draft: DraftPlacement
): BodyItem<TRow>[] {
  if (!draft.tree) {
    return [{ kind: "draft", parentKey: draft.parentKey, depth: 0 }, ...items];
  }
  const { parentKey } = draft;
  let at = items.length;
  let depth = 0;
  if (parentKey !== undefined) {
    const parentAt = items.findIndex(
      (it) => it.kind === "row" && it.row.id === parentKey
    );
    if (parentAt !== -1) {
      const parent = (items[parentAt] as { row: Row<TRow> }).row;
      depth = parent.depth + 1;
      at = parentAt + 1;
      while (at < items.length) {
        const it = items[at];
        if (it.kind !== "row" || it.row.depth <= parent.depth) break;
        at += 1;
      }
    }
  }
  return [
    ...items.slice(0, at),
    { kind: "draft", parentKey, depth },
    ...items.slice(at),
  ];
}

/** The table body's virtualization: the flat item list, the window, the paddings. */
export function useVirtualRows<TRow extends object>({
  allRows,
  groups,
  collapsedGroups,
  draft,
  scrollRef,
}: {
  allRows: Row<TRow>[];
  groups?: GroupBucket<Row<TRow>>[];
  collapsedGroups?: ReadonlySet<string>;
  /** Present while a row-mode create session is open. */
  draft?: DraftPlacement;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const items = useMemo<BodyItem<TRow>[]>(() => {
    let out: BodyItem<TRow>[];
    if (!groups) {
      out = allRows.map((row) => ({ kind: "row" as const, row }));
    } else {
      out = [];
      for (const group of groups) {
        out.push({ kind: "group", group });
        if (!collapsedGroups?.has(group.key)) {
          for (const row of group.rows) out.push({ kind: "row", row });
        }
      }
    }
    return draft ? placeDraft(out, draft) : out;
  }, [groups, collapsedGroups, allRows, draft]);

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
      if (item.kind === "draft") return "draft";
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
