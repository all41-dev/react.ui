import type { Table } from "@tanstack/react-table";
import type { ReactNode } from "react";

import type { useGridGrouping } from "../hooks/useGridGrouping";
import { CardsView } from "./CardsView";
import { Spinner } from "./GridStates";
import { KanbanView } from "./KanbanView";
import { TableView } from "./TableView";

type GridBodyProps<TRow extends object> = {
  table: Table<TRow>;
  getId: (row: TRow) => string | number | undefined;
  /** Accessible name for the grid. */
  label: string;
  isLoading: boolean;
  error: string | Error | null;
  emptyLabel?: string;
  /** Present and `showCards` → the cards/kanban branch; absent → always the table. */
  card?: (row: TRow) => ReactNode;
  showCards: boolean;
  /** Passed whole rather than unpacked — six of these props would be pure plumbing. */
  grouping: ReturnType<typeof useGridGrouping<TRow>>;
  showFilters: boolean;
  selectedRowIds?: ReadonlySet<string>;
  onRowClick?: (row: TRow) => void;
  selectedRowId?: string | number;
  editingRowId?: string | number;
  inlineEditor?: ReactNode;
  isCreating: boolean;
  expandedRowIds: ReadonlySet<string | number>;
  renderExpandedRow?: (row: TRow) => ReactNode;
  /** The row a write just landed on, flashed so the change is locatable. */
  changedRowId?: string | number;
};

/**
 * Which of the three views renders, plus the loading scrim over whichever it is.
 *
 * `overflow-x-auto` with `overflow-y-visible` is deliberate: header filters and cell
 * popovers need to escape vertically while wide column sets still scroll sideways.
 */
export function GridBody<TRow extends object>({
  table,
  getId,
  label,
  isLoading,
  error,
  emptyLabel,
  card,
  showCards,
  grouping,
  showFilters,
  selectedRowIds,
  onRowClick,
  selectedRowId,
  editingRowId,
  inlineEditor,
  isCreating,
  expandedRowIds,
  renderExpandedRow,
  changedRowId,
}: GridBodyProps<TRow>) {
  return (
    <div
      className="relative overflow-x-auto overflow-y-visible isolate w-full"
      aria-busy={isLoading}
    >
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-surface-card/50">
          <div className="pointer-events-auto rounded-control border border-border-default bg-surface-card px-3 py-2 shadow-[var(--elev-1)]">
            <Spinner label="Loading…" />
          </div>
        </div>
      )}

      {showCards && grouping.groups ? (
        // Cards plus a group-by become kanban columns.
        <KanbanView
          groups={grouping.groups}
          getId={getId}
          card={card!}
          selectedRowIds={selectedRowIds}
          onRowClick={onRowClick}
          expandedRowIds={expandedRowIds}
          renderExpandedRow={renderExpandedRow}
        />
      ) : showCards ? (
        <CardsView
          table={table}
          getId={getId}
          card={card!}
          isLoading={isLoading}
          error={error}
          emptyLabel={emptyLabel}
          selectedRowIds={selectedRowIds}
          onRowClick={onRowClick}
          expandedRowIds={expandedRowIds}
          renderExpandedRow={renderExpandedRow}
        />
      ) : (
        <TableView
          table={table}
          getId={getId}
          isLoading={isLoading}
          error={error}
          label={label}
          showFilters={showFilters}
          emptyLabel={emptyLabel}
          selectedRowIds={selectedRowIds}
          groups={grouping.groups}
          collapsedGroups={grouping.collapsedGroups}
          onToggleGroup={grouping.toggleGroup}
          editingRowId={editingRowId}
          inlineEditor={inlineEditor}
          isCreating={isCreating}
          selectedRowId={selectedRowId}
          onRowClick={onRowClick}
          expandedRowIds={expandedRowIds}
          renderExpandedRow={renderExpandedRow}
          changedRowId={changedRowId}
        />
      )}
    </div>
  );
}
