import { useCallback } from "react";

import type { DataGridProps } from "../types/grid";
import { useConfirm } from "./useConfirm";
import { useDataGridTable } from "./useDataGridTable";
import { useEditSession } from "./useEditSession";
import { getColId, useGridColumns } from "./useGridColumns";
import { useGridFilters } from "./useGridFilters";
import { useGridGrouping } from "./useGridGrouping";
import { useGridMutations } from "./useGridMutations";
import { useGridPagination } from "./useGridPagination";
import { useGridRows } from "./useGridRows";
import { useRowSelection } from "./useRowSelection";

/**
 * The grid's whole data plane, composed in dependency order: rows → selection → edit
 * session → filters → pagination → column model → table → grouping → mutations. Pure
 * wiring — each concern keeps its own hook; `DataGrid` itself stays presentation.
 */
export function useDataGridState<TRow extends object, TForm extends object>(
  props: DataGridProps<TRow, TForm>,
  getId: (row: TRow) => string | number | undefined
) {
  const { rows, replaceRow, addRow, removeRow, changedRowId } = useGridRows({
    initialData: props.initialData,
    getId,
  });

  const selection = useRowSelection({
    initialData: props.initialData,
    rows,
    getId,
    onSelectionChange: props.onSelectionChange,
  });

  const edit = useEditSession<TRow>();

  const filters = useGridFilters<TRow, TForm>({
    columns: props.columns,
    getColId,
    initialSorting: props.initialSorting,
  });

  const pagination = useGridPagination({
    pagination: props.pagination,
    columnFilters: filters.columnFilters,
    globalFilter: filters.globalFilter,
    sorting: filters.sorting,
  });

  /*
   * Only add the action column when something can actually render into it, so a
   * read-only grid doesn't carry an empty one.
   */
  const editContainer = props.editContainer ?? "right";
  const hasRowActions =
    editContainer !== "none" ||
    !!props.onDelete ||
    !!props.actionColumnOptions?.onEdit ||
    !!props.actionColumnOptions?.renderActions;

  const title = props.title ?? "Data";
  const userKey =
    props.storageKey ?? `dg:${title.toLowerCase().replace(/\s+/g, "-")}`;

  const gridColumns = useGridColumns<TRow, TForm>({
    columns: props.columns,
    selectable: props.selectable ?? false,
    hasRowActions,
    actionPresentation: props.actionColumnOptions?.presentation ?? "overlay",
    storageKey: userKey,
  });

  const table = useDataGridTable<TRow, TForm>({
    data: rows,
    columns: gridColumns.orderedColumns,
    prefs: gridColumns.prefs,
    prefHandlers: gridColumns.prefHandlers,
    columnFilters: filters.columnFilters,
    onColumnFiltersChange: filters.setColumnFilters,
    globalFilter: filters.globalFilter,
    onGlobalFilterChange: filters.setGlobalFilter,
    sorting: filters.sorting,
    onSortingChange: filters.setSorting,
    paginationEnabled: pagination.enabled,
    pagination: pagination.state,
    onPaginationChange: pagination.onPaginationChange,
  });

  const grouping = useGridGrouping({
    table,
    groupOptions: props.groupOptions,
    defaultGroupBy: props.defaultGroupBy ?? "",
  });

  /*
   * "Reset view": the grid as it renders on a first visit. Each part answers for
   * itself — whether it is untouched, and how to go back — so a new piece of view
   * state either joins this list or stays out of the reset on purpose.
   */
  /* Lifted out of their bundles: the bundles are new objects every render, the
     callbacks inside them are not. */
  const { resetPrefs } = gridColumns;
  const { reset: resetFilters } = filters;
  const { reset: resetGrouping } = grouping;
  const { reset: resetPagination } = pagination;

  const resetView = useCallback(() => {
    resetPrefs();
    resetFilters();
    resetGrouping();
    resetPagination();
  }, [resetPrefs, resetFilters, resetGrouping, resetPagination]);

  const viewIsDefault =
    gridColumns.prefsAreDefault &&
    filters.isDefault &&
    grouping.isDefault &&
    pagination.isDefault;

  const { confirm, ConfirmDialog } = useConfirm();

  const mutations = useGridMutations<TRow, TForm>({
    columns: props.columns,
    zodSchema: props.zodSchema,
    onPersist: props.onPersist,
    onDelete: props.onDelete,
    edit,
    replaceRow,
    addRow,
    removeRow,
    deselect: selection.deselect,
    getId,
    confirm,
  });

  return {
    rows,
    changedRowId,
    selection,
    edit,
    filters,
    pagination,
    gridColumns,
    table,
    grouping,
    mutations,
    resetView,
    viewIsDefault,
    ConfirmDialog,
  };
}
