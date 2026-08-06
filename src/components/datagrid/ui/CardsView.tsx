import type { Row, Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, type ReactNode } from "react";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { EmptyState } from "./GridStates";
import { CardItem } from "./CardItem";

type CardsViewProps<TRow extends object> = {
  table: Table<TRow>;
  getId: (row: TRow) => string | number | undefined;
  card: (row: TRow) => ReactNode;
  isLoading: boolean;
  error: string | Error | null;
  emptyLabel?: string;
  selectedRowIds?: ReadonlySet<string>;
  onRowClick?: (row: TRow) => void;
};

/** Matches the spec's `minmax(268px, 1fr)` grid, in numbers the virtualizer can use. */
const CARD_MIN_WIDTH = 268;
const GAP = 12;
const PADDING = 14;
const ESTIMATED_CARD_HEIGHT = 170;

/**
 * Cards view.
 *
 * Pagination is deliberately bypassed — the spec has the grid render the whole
 * FILTERED set, so this reads getFilteredRowModel rather than the page-sliced
 * getRowModel. That makes virtualization mandatory rather than an optimization:
 * a 500-row resource would otherwise build 500 card subtrees synchronously the
 * moment the view is toggled.
 *
 * Rows of cards are the virtualized unit. The column count is derived from the
 * measured container width (the same arithmetic auto-fill would do), rows are
 * chunked to match, and only the visible chunks are mounted.
 */
export function CardsView<TRow extends object>({
  table,
  getId,
  card,
  isLoading,
  error,
  emptyLabel,
  selectedRowIds,
  onRowClick,
}: CardsViewProps<TRow>) {
  const rows = table.getFilteredRowModel().rows;
  const { ref: scrollRef, width } = useContainerWidth<HTMLDivElement>();

  const columns = useMemo(() => {
    const inner = width - PADDING * 2;
    if (inner <= 0) return 1;
    return Math.max(1, Math.floor((inner + GAP) / (CARD_MIN_WIDTH + GAP)));
  }, [width]);

  const chunks = useMemo(() => {
    const out: Row<TRow>[][] = [];
    for (let i = 0; i < rows.length; i += columns) out.push(rows.slice(i, i + columns));
    return out;
  }, [rows, columns]);

  const virtualizer = useVirtualizer({
    count: chunks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT + GAP,
    overscan: 3,
  });

  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  if (isLoading && rows.length === 0) {
    return (
      <div className="grid gap-3 bg-surface-inset p-3.5" style={gridStyle}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="space-y-2 rounded-control border border-border-default bg-surface-card p-3"
          >
            <div className="rui-skeleton w-3/4" />
            <div className="rui-skeleton w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && rows.length === 0 && !error) {
    return (
      <div className="bg-surface-inset">
        <EmptyState
          title={emptyLabel ?? "No data"}
          description="There are no items to display yet."
        />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-[70vh] overflow-y-auto bg-surface-inset p-3.5 scrollbar"
    >
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((vi) => (
          <div
            key={vi.key}
            // measureElement corrects the estimate — card height varies with content.
            ref={virtualizer.measureElement}
            data-index={vi.index}
            className="absolute left-0 top-0 w-full pb-3"
            style={{ transform: `translateY(${vi.start}px)` }}
          >
            <div className="grid gap-3" style={gridStyle}>
              {chunks[vi.index].map((r) => {
                const id = String(getId(r.original) ?? r.id);
                return (
                  <CardItem
                    key={id}
                    row={r}
                    card={card}
                    selected={selectedRowIds?.has(id) ?? false}
                    onRowClick={onRowClick}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
