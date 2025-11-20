import { type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SkeletonRow } from "./GridStates";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { useColumnLayout } from "../hooks/useColumnLayout";
import { Colgroup } from "./table/Colgroup";
import { HeaderCell } from "./table/HeaderCell";
import { type ReactNode } from "react";
import { DataRowFragment } from "./table/DataRowFragment";

type TableDesktopViewProps<TRow extends object> = {
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

export function TableDesktopView<TRow extends object>({
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
}: TableDesktopViewProps<TRow>) {
  const { ref: wrapperRef, width: containerW } =
    useContainerWidth<HTMLDivElement>();

  const { leafColsAll, lastDataCol, lastColWidth, tableW } = useColumnLayout(
    table,
    containerW
  );

  // ❗ NO MEMO HERE
  const allRows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => wrapperRef.current,
    estimateSize: () => 44, // px per row
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
    <div
      ref={wrapperRef}
      className="relative overflow-x-auto overflow-y-auto isolate w-full max-h-[70vh]"
    >
      <table
        className="hidden md:table table-fixed border-collapse border-spacing-y-1"
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

          {/* Top spacer */}
          {paddingTop > 0 && (
            <tr>
              <td colSpan={leafColCount} style={{ height: paddingTop }} />
            </tr>
          )}

          {/* Virtualized rows */}
          {!isLoading &&
            virtualItems.map((virtualRow) => {
              const r = allRows[virtualRow.index];
              const key = getId(r.original) ?? r.id;
              const rowBgClass = r.index % 2 === 0 ? "bg-white" : "bg-gray-50";
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

          {/* Bottom spacer */}
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
  );
}
