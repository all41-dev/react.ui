import { flexRender, type Table } from "@tanstack/react-table";
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
      <div
        ref={wrapperRef}
        className="relative overflow-x-auto overflow-y-auto isolate w-full max-h-[70vh] hidden md:block"
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

      <div className="block md:hidden space-y-3 p-4">
        {isLoading && rows.length === 0 && (
          <>
            <div className="border rounded-lg p-4 bg-surface-card animate-pulse space-y-2">
              <div className="h-4 bg-surface-inset rounded w-3/4"></div>
              <div className="h-4 bg-surface-inset rounded w-1/2"></div>
            </div>
            <div className="border rounded-lg p-4 bg-surface-card animate-pulse space-y-2">
              <div className="h-4 bg-surface-inset rounded w-3/4"></div>
              <div className="h-4 bg-surface-inset rounded w-1/2"></div>
            </div>
          </>
        )}

        {isCreating && inlineEditor && (
          <div className="border rounded-lg p-4 bg-surface-card shadow-md border-accent">
            <div className="mb-2 text-sm font-medium text-accent">
              New Item
            </div>
            {inlineEditor}
          </div>
        )}

        {!isLoading &&
          table.getRowModel().rows.map((r) => {
            const key = getId(r.original) ?? r.id;
            const cells = r.getVisibleCells();
            const visibleCells = cells.filter((c) => {
              if (c.column.id === "__actions__" || c.column.id === "__select__")
                return false;
              const meta = (c.column.columnDef as any).meta;
              return !meta?.hideOnMobile;
            });

            const actionCell = cells.find((c) => c.column.id === "__actions__");
            const isSelected =
              selectedRowId !== undefined &&
              String(selectedRowId) === String(key);

            const isEditing =
              editingRowId !== undefined &&
              String(key) === String(editingRowId);

            if (isEditing && inlineEditor) {
              return (
                <div
                  key={String(key)}
                  className="border rounded-lg p-4 bg-surface-card shadow-md border-accent"
                >
                  <div className="mb-2 text-sm font-medium text-accent">
                    Editing Item
                  </div>
                  {inlineEditor}
                </div>
              );
            }

            // Split cells into header (first one) and body (rest)
            const [headerCell, ...bodyCells] = visibleCells;

            return (
              <div
                key={String(key)}
                className={`border rounded-lg p-4 bg-surface-card hover:shadow-md transition-shadow flex flex-col gap-3 ${
                  isSelected ? "bg-accent-subtle" : ""
                }`}
                style={
                  isSelected
                    ? {
                        boxShadow: "inset 4px 0 0 0 rgb(59 130 246)",
                      }
                    : undefined
                }
                onClick={() => onRowClick?.(r.original)}
                aria-selected={isSelected || undefined}
              >
                {/* Header Section: First Column + Actions */}
                <div className="flex justify-between items-start gap-3">
                  {headerCell && (
                    <div className="font-semibold text-lg text-body break-words">
                      {flexRender(
                        headerCell.column.columnDef.cell,
                        headerCell.getContext()
                      )}
                    </div>
                  )}

                  {actionCell && (
                    <div className="flex items-center gap-1 shrink-0">
                      {flexRender(
                        actionCell.column.columnDef.cell,
                        actionCell.getContext()
                      )}
                    </div>
                  )}
                </div>

                {/* Body Section: Grid of remaining columns */}
                {bodyCells.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 border-border-default">
                    {bodyCells.map((c) => {
                      const headerDef = c.column.columnDef.header;
                      const headerText =
                        typeof headerDef === "string"
                          ? headerDef
                          : typeof headerDef === "function"
                          ? String(c.column.id || "")
                          : String(headerDef || c.column.id || "");

                      return (
                        <div key={c.id} className="flex flex-col min-w-0">
                          <span className="text-xs text-muted uppercase tracking-wider font-medium mb-0.5">
                            {headerText}
                          </span>
                          <span className="text-sm text-body break-words">
                            {flexRender(
                              c.column.columnDef.cell,
                              c.getContext()
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        {!isLoading && rows.length === 0 && !error && (
          <EmptyState
            title={emptyLabel ?? "No data"}
            description="There are no items to display yet."
          />
        )}
      </div>
    </>
  );
}
