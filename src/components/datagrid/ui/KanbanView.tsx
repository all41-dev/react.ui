import type { Row } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type ReactNode } from "react";
import type { GroupBucket } from "../types/grouping";
import { CardItem } from "./CardItem";

type KanbanViewProps<TRow extends object> = {
  groups: GroupBucket<Row<TRow>>[];
  getId: (row: TRow) => string | number | undefined;
  card: (row: TRow) => ReactNode;
  selectedRowIds?: ReadonlySet<string>;
  onRowClick?: (row: TRow) => void;
};

const ESTIMATED_CARD_HEIGHT = 170;
const GAP = 12;

/** Cards + group-by: one column per bucket, per spec (268–320px, coloured underline). */
export function KanbanView<TRow extends object>({
  groups,
  getId,
  card,
  selectedRowIds,
  onRowClick,
}: KanbanViewProps<TRow>) {
  return (
    <div className="flex max-h-[70vh] gap-3 overflow-x-auto bg-surface-inset p-3 scrollbar">
      {groups.map((group) => (
        <KanbanColumn
          key={group.key}
          group={group}
          getId={getId}
          card={card}
          selectedRowIds={selectedRowIds}
          onRowClick={onRowClick}
        />
      ))}
    </div>
  );
}

function KanbanColumn<TRow extends object>({
  group,
  getId,
  card,
  selectedRowIds,
  onRowClick,
}: {
  group: GroupBucket<Row<TRow>>;
  getId: (row: TRow) => string | number | undefined;
  card: (row: TRow) => ReactNode;
  selectedRowIds?: ReadonlySet<string>;
  onRowClick?: (row: TRow) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Each column virtualizes its own cards. A single tall group would otherwise
  // reintroduce exactly the cost the flat cards grid was virtualized to avoid.
  const virtualizer = useVirtualizer({
    count: group.rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT + GAP,
    overscan: 4,
  });

  return (
    <section className="flex min-w-[268px] max-w-[320px] flex-1 shrink-0 flex-col">
      <header
        className="flex items-center gap-2 border-b-2 pb-1.5"
        style={{ borderBottomColor: group.color ?? "var(--rui-border-default)" }}
      >
        <span className="truncate text-[.8125rem] font-semibold text-body">
          {group.label}
        </span>
        <span className="rounded-full bg-surface-card px-1.5 py-0.5 font-mono text-[.6875rem] leading-none text-muted">
          {group.rows.length}
        </span>
      </header>

      <div ref={scrollRef} className="mt-2 flex-1 overflow-y-auto scrollbar">
        {group.rows.length === 0 ? (
          <p className="px-1 py-3 text-xs text-faint">Empty</p>
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const r = group.rows[vi.index];
              const id = String(getId(r.original) ?? r.id);
              return (
                <div
                  key={id}
                  ref={virtualizer.measureElement}
                  data-index={vi.index}
                  className="absolute left-0 top-0 w-full pb-3"
                  style={{ transform: `translateY(${vi.start}px)` }}
                >
                  <CardItem
                    row={r}
                    card={card}
                    selected={selectedRowIds?.has(id) ?? false}
                    onRowClick={onRowClick}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
