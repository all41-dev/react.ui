import { flexRender, type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SkeletonRow } from "./GridStates";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { useColumnLayout } from "../hooks/useColumnLayout";
import { Colgroup } from "./table/Colgroup";
import { HeaderCell } from "./table/HeaderCell";
import { type ReactNode } from "react";
import { DataRowFragment } from "./table/DataRowFragment";

type TableViewProps<TRow extends object> = {
  table: Table<TRow>;
  getId: (row: TRow) => string | number | undefined;
  isLoading: boolean;
  rows: TRow[];
  error: string | Error | null;
  leafColCount: number;
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

          <thead className="sticky top-0 z-1 bg-gray-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <HeaderCell key={h.id} h={h} />
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="bg-white">
            {isLoading && rows.length === 0 && (
              <>
                <SkeletonRow cols={leafColCount} />
                <SkeletonRow cols={leafColCount} />
                <SkeletonRow cols={leafColCount} />
              </>
            )}

            {isCreating && inlineEditor && (
              <tr className="bg-white border-b border-gray-200">
                <td colSpan={leafColCount} className="p-0 overflow-hidden">
                  <div className="animate-slide-down">
                    <div className="border-l-2 border-blue-400 bg-linear-to-r from-blue-50/50 to-white shadow-sm">
                      {inlineEditor}
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {paddingTop > 0 && (
              <tr>
                <td colSpan={leafColCount} style={{ height: paddingTop }} />
              </tr>
            )}

            {!isLoading &&
              virtualItems.map((virtualRow) => {
                const r = allRows[virtualRow.index];
                const key = getId(r.original) ?? r.id;
                const rowBgClass =
                  r.index % 2 === 0 ? "bg-white" : "bg-gray-50";
                const isEditing =
                  editingRowId !== undefined &&
                  String(key) === String(editingRowId);
                const isSelected =
                  selectedRowId !== undefined &&
                  String(selectedRowId) === String(key);
                const isExpanded = expandedRowIds?.has(key) ?? false;

                return (
                  <DataRowFragment
                    key={String(key)}
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
                );
              })}

            {paddingBottom > 0 && (
              <tr>
                <td colSpan={leafColCount} style={{ height: paddingBottom }} />
              </tr>
            )}

            {!isLoading && rows.length === 0 && !error && (
              <tr>
                <td
                  colSpan={leafColCount}
                  className="text-center text-gray-500 py-8"
                >
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="block md:hidden space-y-3 p-4">
        {isLoading && rows.length === 0 && (
          <>
            <div className="border rounded-lg p-4 bg-white animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="border rounded-lg p-4 bg-white animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </>
        )}

        {isCreating && inlineEditor && (
          <div className="border rounded-lg p-4 bg-white shadow-md border-blue-200">
            <div className="mb-2 text-sm font-medium text-blue-600">
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
              if (c.column.id === "__actions__") return false;
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
                  className="border rounded-lg p-4 bg-white shadow-md border-blue-200"
                >
                  <div className="mb-2 text-sm font-medium text-blue-600">
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
                className={`border rounded-lg p-4 bg-white hover:shadow-md transition-shadow flex flex-col gap-3 ${
                  isSelected ? "bg-blue-50" : ""
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
                    <div className="font-semibold text-lg text-gray-900 break-words">
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
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 border-gray-100">
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
                          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-0.5">
                            {headerText}
                          </span>
                          <span className="text-sm text-gray-700 break-words">
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
          <div className="text-center py-12 text-sm text-gray-500">No data</div>
        )}
      </div>
    </>
  );
}
