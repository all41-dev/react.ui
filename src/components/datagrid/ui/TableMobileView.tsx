import { flexRender, type Table } from "@tanstack/react-table";

type TableMobileViewProps<TRow extends object> = {
  table: Table<TRow>;
  getId: (row: TRow) => string | number | undefined;
  isLoading: boolean;
  rows: TRow[];
  error: string | Error | null;
  selectedRowId?: string | number | undefined;
  onRowClick?: (row: TRow) => void;
};

export function TableMobileView<TRow extends object>({
  table,
  getId,
  isLoading,
  rows,
  error,
  selectedRowId,
  onRowClick,
}: TableMobileViewProps<TRow>) {
  return (
    <div className="block md:hidden space-y-3">
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

          return (
            <div
              key={String(key)}
              className={`border rounded-lg p-4 bg-white hover:shadow-md transition-shadow space-y-2 ${
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
              {visibleCells.map((c) => {
                const headerDef = c.column.columnDef.header;
                const headerText = typeof headerDef === "string"
                  ? headerDef
                  : typeof headerDef === "function"
                  ? String(c.column.id || "")
                  : String(headerDef || c.column.id || "");
                return (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <div className="text-xs font-medium text-gray-500 sm:w-32 sm:shrink-0">
                      {headerText}
                    </div>
                    <div className="text-sm text-gray-900 flex-1 min-w-0">
                      <div className="truncate">
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </div>
                    </div>
                  </div>
                );
              })}
              {actionCell && (
                <div className="pt-2 border-t mt-2 flex items-center gap-2 opacity-100">
                  <div className="flex items-center gap-2">
                    {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
                  </div>
                </div>
              )}
            </div>
          );
        })}

      {!isLoading && rows.length === 0 && !error && (
        <div className="text-center py-12 text-sm text-gray-500">
          No data
        </div>
      )}
    </div>
  );
}

