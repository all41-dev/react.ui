import { Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { toast } from "sonner";
import { useCallback, useId, useImperativeHandle, useMemo, useState } from "react";

import { getApiMessage } from "../../api/errors";
import {
  DataGridContext,
  DataGridSelectionContext,
  type DataGridContextValue,
} from "./DataGridContext";
import { useConfirm } from "./hooks/useConfirm";
import { useDataGridTable } from "./hooks/useDataGridTable";
import { useEditSession } from "./hooks/useEditSession";
import { getColId, useGridColumns } from "./hooks/useGridColumns";
import { useGridFilters } from "./hooks/useGridFilters";
import { useGridGrouping } from "./hooks/useGridGrouping";
import { useGridMutations } from "./hooks/useGridMutations";
import { useGridPagination } from "./hooks/useGridPagination";
import { useGridRows } from "./hooks/useGridRows";
import { useRowSelection } from "./hooks/useRowSelection";
import type { DataGridProps } from "./types/grid";
import { ColumnsPopover } from "./ui/ColumnsPopover";
import { DataGridToolbar } from "./ui/DataGridToolbar";
import { FacetChips } from "./ui/FacetChips";
import { GridBody } from "./ui/GridBody";
import { GridFooter } from "./ui/GridFooter";
import { EditContainer } from "./ui/containers/EditContainers";
import { EditInline } from "./ui/containers/EditInline";
import { CellEditPopover } from "./ui/table/CellEditPopover";
import type { ActionColumnOpts } from "./ui/makeActionColumns";
import { getRowKey } from "./utils/getRowKey";

export type { DataGridProps, DataGridHandle } from "./types/grid";

const EMPTY_EXPANDED_SET = new Set<string | number>();

/*
 * Icons, not words — the design specifies lucide pencil / trash-2, and word buttons do
 * not fit a 26px control. Module scope so the elements aren't rebuilt every render.
 */
const DEFAULT_ACTION_LABELS = {
  edit: <Pencil className="h-4 w-4" aria-hidden />,
  delete: <Trash2 className="h-4 w-4" aria-hidden />,
};

/**
 * Composition only. Every piece of state lives in a hook next door — `useGridRows`,
 * `useEditSession`, `useRowSelection`, `useGridFilters`, `useGridPagination`,
 * `useGridColumns`, `useGridGrouping`, `useGridMutations`, `useDataGridTable` — because
 * when all of it lived here as thirteen independent `useState`s, facts about the same
 * thing drifted apart from each other (the drawer that outlived its edit session being
 * the clearest case). The props type lives in `types/grid.ts`, and the two rendered
 * regions in `ui/GridBody.tsx` and `ui/GridFooter.tsx`.
 */
export function DataGrid<TRow extends object, TForm extends object = TRow>({
  title = "Data",
  subtitle,
  searchable = true,
  emptyLabel,
  card,
  defaultView = "list",
  groupOptions,
  defaultGroupBy = "",
  selectable = false,
  onSelectionChange,
  columns,
  zodSchema,
  initialData,
  idAccessor,
  editContainer = "right",
  onPersist,
  onDelete,
  className,
  toolbar,
  isLoading,
  error,
  onRetry,
  actionColumnOptions,
  storageKey = undefined,
  pagination: paginationProp,
  initialSorting,
  formLayout,
  onRowClick,
  renderExpandedRow,
  expandedRowIds: externalExpandedRowIds,
  ref,
}: DataGridProps<TRow, TForm>) {
  const [view, setView] = useState<"list" | "cards">(defaultView);
  const [selectedRowId, setSelectedRowId] = useState<string | number | undefined>(
    undefined
  );

  const expandedRowIds = externalExpandedRowIds ?? EMPTY_EXPANDED_SET;

  const getId = useCallback((r: TRow) => getRowKey(r, idAccessor), [idAccessor]);

  const { rows, replaceRow, addRow, removeRow } = useGridRows({
    initialData,
    getId,
  });

  const selection = useRowSelection({
    initialData,
    rows,
    getId,
    onSelectionChange,
  });

  const edit = useEditSession<TRow>();

  const filters = useGridFilters<TRow, TForm>({
    columns,
    getColId,
    initialSorting,
  });

  const pagination = useGridPagination({
    pagination: paginationProp,
    columnFilters: filters.columnFilters,
    globalFilter: filters.globalFilter,
    sorting: filters.sorting,
  });

  /*
   * A read-only grid carried an empty overlay action column for nothing. It is added
   * only when something could actually render into it.
   */
  const hasRowActions =
    editContainer !== "none" ||
    !!onDelete ||
    !!actionColumnOptions?.onEdit ||
    !!actionColumnOptions?.renderActions;

  const userKey = storageKey ?? `dg:${title.toLowerCase().replace(/\s+/g, "-")}`;

  const gridColumns = useGridColumns<TRow, TForm>({
    columns,
    selectable,
    hasRowActions,
    actionPresentation: actionColumnOptions?.presentation ?? "overlay",
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

  const grouping = useGridGrouping({ table, groupOptions, defaultGroupBy });

  const { confirm, ConfirmDialog } = useConfirm();

  const {
    handleDelete,
    handleSubmit,
    cellEditColumn,
    handleCellSave,
    startCellEditFromCell,
  } = useGridMutations<TRow, TForm>({
    columns,
    zodSchema,
    onPersist,
    onDelete,
    edit,
    replaceRow,
    addRow,
    removeRow,
    deselect: selection.deselect,
    getId,
    confirm,
  });

  const handleRowClick = useCallback(
    (row: TRow) => {
      const rowId = getId(row);
      setSelectedRowId((prev) =>
        prev !== undefined && String(prev) === String(rowId) ? undefined : rowId
      );
      onRowClick?.(row);
    },
    [getId, onRowClick]
  );

  /*
   * The imperative surface, replacing `cancelEditTrigger` (a number the parent bumped),
   * `onEditStart` and `onCancelEdit`. Those three existed so a parent could drive and
   * mirror an edit session the grid already owns; between them they needed a seeded ref,
   * a second ref for the live session, and an effect to tell a genuine bump from the
   * initial mount. One method replaces all of it.
   */
  useImperativeHandle(
    ref,
    () => ({
      startCreate: edit.startCreate,
      startEdit: edit.startEdit,
      cancelEdit: edit.close,
      isEditing: () => edit.session.kind !== "idle",
      clearSelection: selection.clear,
    }),
    [edit.startCreate, edit.startEdit, edit.close, edit.session.kind, selection.clear]
  );

  const tooltipId = useId().replace(/:/g, "_");
  const canCellEdit = !!onPersist;

  const rowActions = useMemo<ActionColumnOpts<TRow>>(
    () => ({
      getId,
      // With no container to open, an Edit button would do nothing visible.
      onEdit: editContainer !== "none" ? edit.startEdit : undefined,
      onDelete: onDelete ? handleDelete : undefined,
      onError: (err) => toast.error(getApiMessage(err, "Delete failed")),
      labels: DEFAULT_ACTION_LABELS,
      ...actionColumnOptions,
    }),
    [getId, editContainer, edit.startEdit, onDelete, handleDelete, actionColumnOptions]
  );

  /*
   * This value changes whenever the grid's own props do, and its consumers re-render —
   * which they were doing anyway. The point of moving these out of the column closures
   * is that `orderedColumns` no longer changes, so TanStack keeps its column model
   * instead of rebuilding it on every render and every checkbox click.
   */
  const contextValue = useMemo<DataGridContextValue>(
    () => ({
      tooltipId,
      canCellEdit,
      startCellEdit: startCellEditFromCell,
      getId: getId as (row: unknown) => string | number | undefined,
      rowActions: rowActions as ActionColumnOpts<any>,
    }),
    [tooltipId, canCellEdit, startCellEditFromCell, getId, rowActions]
  );

  const facetChips = useMemo(
    () => filters.buildFacetChips(grouping.activeGroupOption, grouping.clearGroupBy),
    [filters, grouping.activeGroupOption, grouping.clearGroupBy]
  );

  const showCards = !!card && view === "cards";
  const inlineEditing = editContainer === "inline";

  const inlineEditor =
    inlineEditing && edit.session.kind !== "idle" && edit.session.kind !== "cell" ? (
      <EditInline<TRow, TForm>
        open
        mode={edit.formMode}
        row={edit.editingRow}
        columns={columns}
        zodSchema={zodSchema}
        formLayout={formLayout}
        onCancel={edit.close}
        onSubmit={handleSubmit}
      />
    ) : undefined;

  return (
    <DataGridContext.Provider value={contextValue}>
      <DataGridSelectionContext.Provider value={selection.contextValue}>
        <div
          /*
           * `.og` in the prototype. `overflow-hidden` is load-bearing — without it the
           * sticky header and footer paint over the rounded corners. The font and colour
           * were missing entirely, which meant `--rui-font-sans` and `--rui-text-body`
           * never reached the component and a consumer got their host page's type.
           */
          className={[
            "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-surface",
            "border border-border-default bg-surface-card shadow-[var(--elev-2)]",
            "font-sans text-[.8125rem] text-body",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <DataGridToolbar
            title={title}
            subtitle={subtitle}
            count={rows.length}
            toolbar={toolbar}
            editContainer={editContainer}
            error={error ?? null}
            onAddClick={edit.startCreate}
            onRetry={onRetry}
            searchable={searchable}
            searchValue={filters.globalFilter}
            onSearchChange={filters.setGlobalFilter}
            hasFilterableColumns={filters.hasFilterableColumns}
            filtersShown={filters.showFilters}
            activeFilterCount={filters.columnFilters.length}
            onToggleFilters={filters.toggleFilters}
            columnsControl={
              <ColumnsPopover table={table} onReset={gridColumns.resetPrefs} />
            }
            view={card ? view : undefined}
            onViewChange={card ? setView : undefined}
            groupOptions={groupOptions}
            groupBy={grouping.groupBy}
            onGroupByChange={grouping.setGroupBy}
          />

          <FacetChips chips={facetChips} />

          <GridBody<TRow>
            table={table}
            getId={getId}
            label={title}
            isLoading={!!isLoading}
            error={error ?? null}
            emptyLabel={emptyLabel}
            card={card}
            showCards={showCards}
            grouping={grouping}
            showFilters={filters.showFilters && filters.hasFilterableColumns}
            selectedRowIds={selectable ? selection.selectedIds : undefined}
            onRowClick={onRowClick ? handleRowClick : undefined}
            selectedRowId={selectedRowId}
            editingRowId={
              inlineEditing && edit.editingRow ? getId(edit.editingRow) : undefined
            }
            inlineEditor={inlineEditor}
            isCreating={inlineEditing && edit.session.kind === "create"}
            expandedRowIds={expandedRowIds}
            renderExpandedRow={renderExpandedRow}
          />

          <GridFooter<TRow>
            table={table}
            paginationEnabled={pagination.enabled}
            pageSizeOptions={pagination.pageSizeOptions}
            showCards={showCards}
            grouped={!!grouping.groups}
            selectable={selectable}
            selectedCount={selection.selectedIds.size}
            onClearSelection={selection.clear}
          />

          {!inlineEditing && (
            <EditContainer<TRow, TForm>
              kind={editContainer}
              open={edit.isFormOpen}
              mode={edit.formMode}
              row={edit.editingRow}
              columns={columns}
              zodSchema={zodSchema}
              formLayout={formLayout}
              onCancel={edit.close}
              onSubmit={handleSubmit}
            />
          )}

          {edit.cell && cellEditColumn && (
            <CellEditPopover<TRow, TForm>
              state={edit.cell}
              column={cellEditColumn}
              onCancel={edit.close}
              onSave={handleCellSave}
            />
          )}

          {ConfirmDialog}
        </div>

        {/*
         * Outside the grid root, and portaled to the body. It used to live inside that
         * root, which is `overflow-hidden` (load-bearing — see the class list above), so
         * a tooltip on any cell near an edge was clipped by the very element that gives
         * the grid its rounded corners. The tooltip is positioned fixed against its
         * anchor, so nothing about placement depends on being a descendant.
         */}
        <Tooltip id={tooltipId} positionStrategy="fixed" />
      </DataGridSelectionContext.Provider>
    </DataGridContext.Provider>
  );
}
