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
import { useGridTree } from "./useGridTree";
import { useResetView } from "./useResetView";
import { useRowSelection } from "./useRowSelection";

/**
 * The grid's whole data plane, composed in dependency order: rows → selection → edit
 * session → filters → tree → pagination → column model → table → grouping → mutations.
 * Pure wiring — each concern keeps its own hook; `DataGrid` itself stays presentation.
 */
export function useDataGridState<TRow extends object, TForm extends object>(
  props: DataGridProps<TRow, TForm>,
  getKey: (row: TRow) => string
) {
  const { rows, replaceRow, addRow, removeRows, changedRowId } = useGridRows({
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

  const tree = useGridTree<TRow>({
    config: props.tree,
    rows,
    getKey,
    filtering: filters.columnFilters.length > 0 || filters.globalFilter !== "",
  });

  const pagination = useGridPagination({
    pagination: props.pagination,
    columnFilters: filters.columnFilters,
    globalFilter: filters.globalFilter,
    sorting: filters.sorting,
    forcedOff: tree.enabled,
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
    data: tree.roots ?? rows,
    tree: tree.getSubRows
      ? { getSubRows: tree.getSubRows, expanded: tree.expanded }
      : undefined,
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

  /* Grouping partitions a flat list, so tree mode runs without it. */
  const grouping = useGridGrouping({
    table,
    groupOptions: tree.enabled ? undefined : props.groupOptions,
    defaultGroupBy: tree.enabled ? "" : (props.defaultGroupBy ?? ""),
  });

  const { resetView, viewIsDefault } = useResetView({
    columnPrefs: {
      reset: gridColumns.resetPrefs,
      isDefault: gridColumns.prefsAreDefault,
    },
    filters,
    grouping,
    pagination,
    tree,
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
    removeRows,
    descendantKeysOf: tree.descendantKeysOf,
    reveal: tree.reveal,
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
    tree,
    grouping,
    mutations,
    resetView,
    viewIsDefault,
    ConfirmDialog,
  };
}
