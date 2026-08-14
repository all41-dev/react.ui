import type { CSSProperties } from "react";
import type { Table } from "@tanstack/react-table";

import { EmptyState, NoResultsState } from "./GridStates";

/** Four cards' worth of skeleton, laid out on the same grid the real cards use. */
export function CardsSkeleton({ gridStyle }: { gridStyle: CSSProperties }) {
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

/**
 * No cards to show. The caller has already established that the filtered set is empty, so
 * the only question left is whether that is "no data at all" or "no matches" — the same
 * two states the table view distinguishes.
 */
export function CardsEmpty<TRow extends object>({
  table,
  emptyLabel,
}: {
  table: Table<TRow>;
  emptyLabel?: string;
}) {
  const { columnFilters, globalFilter } = table.getState();
  const hasActiveFilters =
    columnFilters.length > 0 || String(globalFilter ?? "").trim() !== "";
  const hasAnyData = table.getCoreRowModel().rows.length > 0;

  return (
    <div className="bg-surface-inset">
      {hasActiveFilters && hasAnyData ? (
        <NoResultsState
          onClearFilters={() => {
            table.resetColumnFilters();
            table.setGlobalFilter("");
          }}
        />
      ) : (
        <EmptyState
          title={emptyLabel ?? "No data"}
          description="There are no items to display yet."
        />
      )}
    </div>
  );
}
