import { useCallback, useEffect, useState } from "react";

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

  /*
   * Row mode draws a create session as a draft row under the parent its seed names. The
   * parent is opened the moment the session starts, so the draft lands on screen; the
   * body places it by this key. Tree mode renders the table only, so `editContainer`
   * alone says whether the session is a row.
   */
  const rowMode = props.editContainer === "row";
  const draftParentKey =
    rowMode && edit.session.kind === "create"
      ? tree.parentKeyOf(edit.createSeed)
      : undefined;
  const { revealParent } = tree;
  useEffect(() => {
    if (draftParentKey !== undefined) revealParent(draftParentKey);
  }, [draftParentKey, revealParent]);

  /*
   * Row mode: the row whose first editable cell takes focus once a session closes, so a
   * save or a cancel does not drop focus to the body. A new object per request, so the
   * same row saved twice is focused twice.
   */
  const [rowFocus, setRowFocus] = useState<{ key: string }>();
  const focusRow = useCallback((key: string) => setRowFocus({ key }), []);
  const focusSavedRow = useCallback((row: TRow) => focusRow(getKey(row)), [focusRow, getKey]);

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
    onSaved: rowMode ? focusSavedRow : undefined,
  });

  return {
    rows,
    changedRowId,
    selection,
    edit,
    /** Row mode, create session: the parent the draft sits under; `undefined` for a root. */
    draftParentKey,
    /** Row mode: the row to hand focus to after a session closes. */
    rowFocus,
    focusRow,
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
