import { flexRender, type Row, type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, type ReactNode } from "react";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { EmptyState } from "./GridStates";

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
const PADDING = 12;
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
      <div className="grid gap-3 bg-surface-inset p-3" style={gridStyle}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse space-y-2 rounded-lg border border-border-default bg-surface-card p-4"
          >
            <div className="h-4 w-3/4 rounded bg-surface-inset" />
            <div className="h-4 w-1/2 rounded bg-surface-inset" />
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
      className="max-h-[70vh] overflow-y-auto bg-surface-inset p-3 scrollbar"
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

function CardItem<TRow extends object>({
  row,
  card,
  selected,
  onRowClick,
}: {
  row: Row<TRow>;
  card: (row: TRow) => ReactNode;
  selected: boolean;
  onRowClick?: (row: TRow) => void;
}) {
  const cells = row.getVisibleCells();
  const selectCell = cells.find((c) => c.column.id === "__select__");
  const actionCell = cells.find((c) => c.column.id === "__actions__");

  return (
    <div
      onClick={() => onRowClick?.(row.original)}
      aria-selected={selected || undefined}
      className={[
        "group/card relative flex flex-col rounded-lg border transition-all duration-150",
        "hover:-translate-y-px hover:shadow-md",
        // Exclusive — emitting both bg utilities would leave the winner to stylesheet
        // order rather than intent.
        selected
          ? "border-accent bg-accent-subtle"
          : "border-border-default bg-surface-card",
        onRowClick ? "cursor-pointer" : "",
      ].join(" ")}
    >
      {selectCell && (
        <div
          // Visible on hover or while selected, per spec.
          className={[
            "absolute right-2 top-2 z-10 transition-opacity",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover/card:opacity-100 focus-within:opacity-100",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
        </div>
      )}

      <div className="min-w-0 flex-1 p-4">{card(row.original)}</div>

      {actionCell && (
        // Always visible here — no hover-reveal, unlike table rows.
        //
        // `relative` + a floor height are load-bearing: the action cell's own content is
        // `md:absolute top-0 right-0 h-full`, so without a positioned ancestor it would
        // anchor to the card and land on top of the checkbox. Containing it here pins it
        // to the footer's right edge, and the floor keeps the footer from collapsing now
        // that its only child is taken out of flow.
        <div
          className="relative min-h-[38px] border-t border-border-default px-2"
          onClick={(e) => e.stopPropagation()}
        >
          {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
        </div>
      )}
    </div>
  );
}
