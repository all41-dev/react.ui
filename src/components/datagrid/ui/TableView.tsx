import { type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SkeletonRow, EmptyState } from "./GridStates";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { useColumnLayout } from "../hooks/useColumnLayout";
import { Colgroup } from "./table/Colgroup";
import { HeaderCell } from "./table/HeaderCell";
import { HeaderFilter } from "./table/HeaderFilter";
import { type ReactNode } from "react";
import { DataRowFragment } from "./table/DataRowFragment";

type TableViewProps<TRow extends object> = {
  table: Table<TRow>;
  getId: (row: TRow) => string | number | undefined;
  isLoading: boolean;
  rows: TRow[];
  error: string | Error | null;
  leafColCount: number;
  /** Renders the per-column filter row under the header (toolbar Filters toggle). */
  showFilters?: boolean;
  emptyLabel?: string;
  /** Checkbox-selected row ids (multi). Merged into the selected-row styling. */
  selectedRowIds?: ReadonlySet<string>;
  editingRowId?: string | number | undefined;
  inlineEditor?: ReactNode;
  isCreating?: boolean;
  selectedRowId?: string | number | undefined;
  onRowClick?: (row: TRow) => void;
  expandedRowIds?: Set<string | number>;
  renderExpandedRow?: (row: TRow) => ReactNode;
};

export function TableView<TRow extends object>({
  table,
  getId,
  isLoading,
  rows,
  error,
  leafColCount,
  showFilters,
  emptyLabel,
  selectedRowIds,
  editingRowId,
  inlineEditor,
  isCreating,
  selectedRowId,
  onRowClick,
  expandedRowIds,
  renderExpandedRow,
}: TableViewProps<TRow>) {
  const { ref: wrapperRef, width: containerW } =
    useContainerWidth<HTMLDivElement>();

  const { leafColsAll, lastDataCol, lastColWidth, tableW } = useColumnLayout(
    table,
    containerW
  );

  const allRows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => wrapperRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;

  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <>
      {/*
       * Single scroll container for all breakpoints. There used to be a second,
       * always-mounted `block md:hidden` card list here that mapped over EVERY row —
       * on desktop with 10k rows it built 10k hidden card nodes alongside the
       * virtualized table, defeating the virtualizer entirely (#13). Small screens
       * scroll this table horizontally; consumers wanting a card layout pass `card`
       * and get the real cards view.
       */}
      <div
        ref={wrapperRef}
        className="relative isolate max-h-[70vh] w-full overflow-x-auto overflow-y-auto"
      >
        <table
          className="table-fixed border-collapse border-spacing-y-1"
          style={{ width: `${tableW}px` }}
        >
          <Colgroup
            leafColsAll={leafColsAll}
            lastDataCol={lastDataCol}
            lastColWidth={lastColWidth}
          />

          <thead className="sticky top-0 z-1 bg-surface-inset">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <HeaderCell key={h.id} h={h} />
                ))}
              </tr>
            ))}
            {/* Filter row lives in thead so it stays sticky under the header. */}
            {showFilters && (
              <tr className="bg-surface-inset">
                {table
                  .getHeaderGroups()
                  .at(-1)!
                  .headers.map((h) =>
                    h.isPlaceholder || h.column.id === "__actions__" ? (
                      <th key={h.id} className="!w-0 !p-0 border-none" aria-hidden="true" />
                    ) : (
                      <th
                        key={h.id}
                        className="border-b border-border-default px-3 pb-2 pt-0 text-left align-top font-normal"
                      >
                        <HeaderFilter h={h} />
                      </th>
                    )
                  )}
              </tr>
            )}
          </thead>

          {isLoading && rows.length === 0 && (
            <tbody className="bg-surface-card">
              <SkeletonRow cols={leafColCount} />
              <SkeletonRow cols={leafColCount} />
              <SkeletonRow cols={leafColCount} />
            </tbody>
          )}

          {isCreating && inlineEditor && (
            <tbody className="bg-surface-card border-b border-border-default">
              <tr>
                <td colSpan={leafColCount} className="p-0 overflow-hidden">
                  <div className="animate-slide-down">
                    <div className="border-l-2 border-accent bg-linear-to-r from-accent-subtle to-surface-card shadow-sm">
                      {inlineEditor}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          )}

          {paddingTop > 0 && (
            <tbody>
              <tr>
                <td colSpan={leafColCount} style={{ height: `${paddingTop}px` }} />
              </tr>
            </tbody>
          )}

          {!isLoading &&
            virtualItems.map((virtualRow) => {
              const r = allRows[virtualRow.index];
              const key = getId(r.original) ?? r.id;
              const rowBgClass =
                r.index % 2 === 0 ? "bg-surface-card" : "bg-surface-inset";
              const isEditing =
                editingRowId !== undefined &&
                String(key) === String(editingRowId);
              const isSelected =
                (selectedRowId !== undefined &&
                  String(selectedRowId) === String(key)) ||
                (selectedRowIds?.has(String(key)) ?? false);
              const isExpanded = expandedRowIds?.has(key) ?? false;

              return (
                <tbody
                  key={String(key)}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className={rowBgClass}
                >
                  <DataRowFragment
                    row={r}
                    leafColCount={leafColCount}
                    rowBgClass={rowBgClass}
                    isEditing={isEditing}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    inlineEditor={isEditing ? inlineEditor : undefined}
                    renderExpandedRow={renderExpandedRow}
                    onRowClick={onRowClick}
                  />
                </tbody>
              );
            })}

          {paddingBottom > 0 && (
            <tbody>
              <tr>
                <td colSpan={leafColCount} style={{ height: `${paddingBottom}px` }} />
              </tr>
            </tbody>
          )}

          {!isLoading && rows.length === 0 && !error && (
            <tbody className="bg-surface-card">
              <tr>
                <td colSpan={leafColCount}>
                  <EmptyState
                    title={emptyLabel ?? "No data"}
                    description="There are no items to display yet."
                  />
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

    </>
  );
}
