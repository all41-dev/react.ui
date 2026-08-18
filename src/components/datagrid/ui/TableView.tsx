import { type Row, type Table } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { useColumnLayout } from "../hooks/useColumnLayout";
import { useVirtualRows } from "../hooks/useVirtualRows";
import { GridBodies } from "./table/GridBodies";
import { GridTable } from "./table/GridTable";
import type { GroupBucket } from "../types/grouping";

type TableViewProps<TRow extends object> = {
  table: Table<TRow>;
  isLoading: boolean;
  error: string | Error | null;
  /** Accessible name for the grid. */
  label?: string;
  /** Renders the per-column filter row under the header (toolbar Filters toggle). */
  showFilters?: boolean;
  emptyLabel?: string;
  /** Checkbox-selected row ids (multi). Merged into the selected-row styling. */
  selectedRowIds?: ReadonlySet<string>;
  /** When present the body is grouped: header rows interleaved with each group's rows. */
  groups?: GroupBucket<Row<TRow>>[];
  collapsedGroups?: ReadonlySet<string>;
  onToggleGroup?: (key: string) => void;
  editingRowId?: string;
  inlineEditor?: ReactNode;
  isCreating?: boolean;
  selectedRowId?: string;
  onRowClick?: (row: TRow) => void;
  expandedRowIds?: ReadonlySet<string>;
  renderExpandedRow?: (row: TRow) => ReactNode;
  changedRowId?: string;
};

export function TableView<TRow extends object>({
  table,
  isLoading,
  error,
  label,
  showFilters,
  emptyLabel,
  selectedRowIds,
  groups,
  collapsedGroups,
  onToggleGroup,
  editingRowId,
  inlineEditor,
  isCreating,
  selectedRowId,
  onRowClick,
  expandedRowIds,
  renderExpandedRow,
  changedRowId,
}: TableViewProps<TRow>) {
  const { ref: wrapperRef, width: containerW } =
    useContainerWidth<HTMLDivElement>();

  const { leafColsAll, lastDataColId, lastColWidth, tableW } = useColumnLayout(
    table,
    containerW
  );

  /*
   * Every colSpan in this table — skeletons, the virtualizer's padding rows, the empty
   * state, the expanded-row panel, the inline editor. It has to be the count of columns
   * actually RENDERED, so it comes from the table rather than from the consumer's
   * `columns` array: that array excludes the injected select column, may itself contain
   * an `__actions__` column that was already counted, and says nothing about column
   * visibility. Over-spanning cells stretch past the `<colgroup>` and shear the layout.
   */
  const leafColCount = leafColsAll.length;

  /* The header `<tr>`s are rows 1..n of a `role="grid"`, so the body's `aria-rowindex`
     starts after them and `aria-rowcount` includes them. */
  const headerRowCount = table.getHeaderGroups().length + (showFilters ? 1 : 0);

  const { items, virtualItems, paddingTop, paddingBottom, measureElement, headRef } =
    useVirtualRows({
      allRows: table.getRowModel().rows,
      groups,
      collapsedGroups,
      scrollRef: wrapperRef,
    });

  return (
    /*
     * One scroll container at every breakpoint. Don't add a hidden mobile card list
     * here — mapping every row into one defeats the virtualizer. Small screens scroll
     * this table horizontally, and a consumer who wants cards passes `card`.
     */
    <div
      ref={wrapperRef}
      className="relative isolate max-h-[70vh] w-full overflow-x-auto overflow-y-auto"
    >
      <GridTable
        table={table}
        label={label}
        showFilters={showFilters}
        headRef={headRef}
        tableW={tableW}
        leafColsAll={leafColsAll}
        lastDataColId={lastDataColId}
        lastColWidth={lastColWidth}
        rowCount={items.length + headerRowCount}
      >
        <GridBodies
          table={table}
          isLoading={isLoading}
          error={error}
          emptyLabel={emptyLabel}
          leafColCount={leafColCount}
          leafCols={leafColsAll}
          items={items}
          virtualItems={virtualItems}
          measureElement={measureElement}
          paddingTop={paddingTop}
          paddingBottom={paddingBottom}
          rowIndexOffset={headerRowCount}
          collapsedGroups={collapsedGroups}
          onToggleGroup={onToggleGroup}
          editingRowId={editingRowId}
          inlineEditor={inlineEditor}
          viewportWidth={containerW}
          isCreating={isCreating}
          selectedRowId={selectedRowId}
          selectedRowIds={selectedRowIds}
          onRowClick={onRowClick}
          expandedRowIds={expandedRowIds}
          renderExpandedRow={renderExpandedRow}
          changedRowId={changedRowId}
        />
      </GridTable>
    </div>
  );
}
