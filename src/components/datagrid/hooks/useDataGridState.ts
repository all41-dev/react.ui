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
import { useResetView } from "./useResetView";
import { useRowSelection } from "./useRowSelection";

/**
 * The grid's whole data plane, composed in dependency order: rows → selection → edit
 * session → filters → pagination → column model → table → grouping → mutations. Pure
 * wiring — each concern keeps its own hook; `DataGrid` itself stays presentation.
 */
export function useDataGridState<TRow extends object, TForm extends object>(
  props: DataGridProps<TRow, TForm>,
  getKey: (row: TRow) => string
) {
  const { rows, replaceRow, addRow, removeRow, changedRowId } = useGridRows({
    initialData: props.initialData,
    getKey,
  });

  const selection = useRowSelection({
    initialData: props.initialData,
    rows,
    getKey,
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
    storageKey: userKey,
  });

  const table = useDataGridTable<TRow, TForm>({
    data: rows,
    columns: gridColumns.orderedColumns,
    getRowId: getKey,
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

  const { resetView, viewIsDefault } = useResetView({
    columnPrefs: {
      reset: gridColumns.resetPrefs,
      isDefault: gridColumns.prefsAreDefault,
    },
    filters,
    grouping,
    pagination,
  });

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
    getKey,
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
