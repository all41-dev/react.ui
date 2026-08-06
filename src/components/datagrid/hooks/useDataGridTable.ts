import { useMemo } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from "@tanstack/react-table";

import type { WithMeta } from "../types/column";

type Params<TRow extends object, TForm extends object> = {
  data: TRow[];
  columns: WithMeta<TRow, TForm>[];
  prefs: {
    columnSizing: Record<string, number>;
    columnVisibility: VisibilityState;
    columnOrder: string[];
  };
  prefHandlers: {
    onColumnSizingChange: (updater: Updater<Record<string, number>>) => void;
    onColumnVisibilityChange: (updater: Updater<VisibilityState>) => void;
    onColumnOrderChange: (updater: Updater<string[]>) => void;
  };
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  globalFilter: string;
  onGlobalFilterChange: OnChangeFn<string>;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  paginationEnabled: boolean;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
};

const DEFAULT_COLUMN = {
  enableResizing: true,
  minSize: 40,
  size: 150,
  maxSize: 1000,
};

/** The `useReactTable` call and nothing else. */
export function useDataGridTable<TRow extends object, TForm extends object>({
  data,
  columns,
  prefs,
  prefHandlers,
  columnFilters,
  onColumnFiltersChange,
  globalFilter,
  onGlobalFilterChange,
  sorting,
  onSortingChange,
  paginationEnabled,
  pagination,
  onPaginationChange,
}: Params<TRow, TForm>) {
  const coreRowModel = useMemo(() => getCoreRowModel(), []);
  const sortedRowModel = useMemo(() => getSortedRowModel(), []);
  const filteredRowModel = useMemo(() => getFilteredRowModel(), []);
  const paginationRowModel = useMemo(() => getPaginationRowModel(), []);

  return useReactTable({
    data,
    columns,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    ...(paginationEnabled ? { getPaginationRowModel: paginationRowModel } : {}),
    defaultColumn: DEFAULT_COLUMN,
    columnResizeMode: "onChange",
    columnResizeDirection: "ltr",
    // Toolbar search: contains, case-insensitive, across every globally-filterable
    // column — the built-in fn reads each column's accessor, which is the spec's
    // "uses column.value(row) when defined".
    globalFilterFn: "includesString",
    state: {
      columnSizing: prefs.columnSizing,
      columnVisibility: prefs.columnVisibility,
      columnOrder: prefs.columnOrder,
      columnFilters,
      globalFilter,
      sorting,
      ...(paginationEnabled ? { pagination } : {}),
    },
    onColumnSizingChange: prefHandlers.onColumnSizingChange,
    onColumnVisibilityChange: prefHandlers.onColumnVisibilityChange,
    onColumnOrderChange: prefHandlers.onColumnOrderChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onSortingChange,
    ...(paginationEnabled ? { onPaginationChange } : {}),
  });
}
