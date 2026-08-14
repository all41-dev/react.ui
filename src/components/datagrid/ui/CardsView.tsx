import type { Row, Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, type ReactNode } from "react";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { CardsEmpty, CardsSkeleton } from "./CardsPlaceholders";
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
  expandedRowIds?: ReadonlySet<string | number>;
  renderExpandedRow?: (row: TRow) => ReactNode;
};

/** Matches the spec's `minmax(268px, 1fr)` grid, in numbers the virtualizer can use. */
const CARD_MIN_WIDTH = 268;
const GAP = 12;
const PADDING = 14;
const ESTIMATED_CARD_HEIGHT = 170;

/**
 * Cards view.
 *
 * Pagination is deliberately bypassed — the cards view renders the whole filtered set,
 * so this reads the sorted row model rather than the page-sliced one. That makes
 * virtualization mandatory rather than an optimization: a 500-row resource would
 * otherwise build 500 card subtrees synchronously the moment the view is toggled.
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
  expandedRowIds,
  renderExpandedRow,
}: CardsViewProps<TRow>) {
  /* Sorted, not filtered. TanStack's pipeline is core → filtered → sorted → paginated,
     so reaching past the page slice has to start from the sorted model — the filtered
     one is pre-sort and would drop `initialSorting` and every header sort. */
  const rows = table.getSortedRowModel().rows;
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

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is compiler-incompatible by design; skipping memoization here is the intended behavior.
  const virtualizer = useVirtualizer({
    count: chunks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT + GAP,
    overscan: 3,
  });

  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  if (isLoading && rows.length === 0) {
    return <CardsSkeleton gridStyle={gridStyle} />;
  }

  if (!isLoading && rows.length === 0 && !error) {
    return <CardsEmpty table={table} emptyLabel={emptyLabel} />;
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
              {/* `columns` is derived from the measured width; if it changes between the
                  virtualizer's count and this render the chunk can be gone. */}
              {chunks[vi.index]?.map((r) => {
                // Raw key for the expansion lookup — TableView compares unstringified.
                const rawKey = getId(r.original) ?? r.id;
                const id = String(rawKey);
                return (
                  <CardItem
                    key={id}
                    row={r}
                    card={card}
                    selected={selectedRowIds?.has(id) ?? false}
                    onRowClick={onRowClick}
                    expanded={expandedRowIds?.has(rawKey) ?? false}
                    renderExpandedRow={renderExpandedRow}
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
