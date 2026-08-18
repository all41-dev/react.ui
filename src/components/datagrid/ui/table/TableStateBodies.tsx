import type { Table } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { SkeletonRow, EmptyState, NoResultsState } from "../GridStates";

/** First-load placeholder — three skeleton rows, only while loading with nothing kept. */
export function SkeletonBody<TRow extends object>({
  table,
  isLoading,
  cols,
}: {
  table: Table<TRow>;
  isLoading: boolean;
  cols: number;
}) {
  if (!isLoading || table.getCoreRowModel().rows.length > 0) return null;
  return (
    <tbody className="bg-surface-card">
      <SkeletonRow cols={cols} />
      <SkeletonRow cols={cols} />
      <SkeletonRow cols={cols} />
    </tbody>
  );
}

/** The inline create form, rendered as its own body above the data rows. */
export function CreatingEditorBody({
  leafColCount,
  children,
}: {
  leafColCount: number;
  children: ReactNode;
}) {
  return (
    <tbody className="border-b border-border-default">
      <tr>
        <td colSpan={leafColCount} className="h-auto overflow-hidden p-0">
          <div className="animate-slide-down border-t border-[color-mix(in_srgb,var(--rui-accent)_45%,transparent)] bg-surface-inset">
            {children}
          </div>
        </td>
      </tr>
    </tbody>
  );
}

/** A virtualizer spacer — keeps unmounted rows' scroll space occupied. */
export function PaddingBody({
  height,
  colSpan,
}: {
  height: number;
  colSpan: number;
}) {
  if (height <= 0) return null;
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan} style={{ height: `${height}px` }} />
      </tr>
    </tbody>
  );
}

/**
 * "Nothing here yet" and "nothing matches your filters" are different states with
 * different fixes, so filtering to zero rows must still show an empty state. Read the
 * counts off the table, not off the parent's unfiltered row array — that array cannot
 * tell the two apart.
 */
export function EmptyBody<TRow extends object>({
  table,
  isLoading,
  error,
  leafColCount,
  emptyLabel,
}: {
  table: Table<TRow>;
  isLoading: boolean;
  error: string | Error | null;
  leafColCount: number;
  emptyLabel?: string;
}) {
  const totalRowCount = table.getCoreRowModel().rows.length;
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const { columnFilters, globalFilter } = table.getState();
  const hasActiveFilters =
    columnFilters.length > 0 || String(globalFilter ?? "").trim() !== "";

  if (isLoading || filteredRowCount > 0 || error) return null;

  const clearFilters = () => {
    table.resetColumnFilters();
    table.setGlobalFilter("");
  };

  return (
    <tbody className="bg-surface-card">
      <tr>
        <td colSpan={leafColCount}>
          {hasActiveFilters && totalRowCount > 0 ? (
            <NoResultsState onClearFilters={clearFilters} />
          ) : (
            <EmptyState
              title={emptyLabel ?? "No data"}
              description="There are no items to display yet."
            />
          )}
        </td>
      </tr>
    </tbody>
  );
}
