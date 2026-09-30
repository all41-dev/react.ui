import { useMemo } from "react";
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type ExpandedState,
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
  /**
   * The grid's row identity. Given to TanStack so `row.id` IS the grid key — every other
   * site reads `row.id` rather than deriving a key of its own.
   */
  getRowId: (row: TRow) => string;
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
  /** Tree mode. `data` is then the root rows and the rest hang off `getSubRows`. */
  tree?: {
    getSubRows: (row: TRow) => TRow[] | undefined;
    expanded: ExpandedState;
  };
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
  getRowId,
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
  tree,
}: Params<TRow, TForm>) {
  const coreRowModel = useMemo(() => getCoreRowModel(), []);
  const sortedRowModel = useMemo(() => getSortedRowModel(), []);
  const filteredRowModel = useMemo(() => getFilteredRowModel(), []);
  const paginationRowModel = useMemo(() => getPaginationRowModel(), []);
  const expandedRowModel = useMemo(() => getExpandedRowModel(), []);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is compiler-incompatible by design; skipping memoization here is the intended behavior.
  return useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    ...(paginationEnabled ? { getPaginationRowModel: paginationRowModel } : {}),
    /* `filterFromLeafRows` keeps a row when it matches or any descendant is kept, so a
       match never loses its ancestors. `expanded` is written by `useGridTree` alone. */
    ...(tree
      ? {
          getSubRows: tree.getSubRows,
          getExpandedRowModel: expandedRowModel,
          filterFromLeafRows: true,
        }
      : {}),
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
      ...(tree ? { expanded: tree.expanded } : {}),
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
