import type { SortingState } from "@tanstack/react-table";
import type { ZodType } from "zod";
import { Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { toast } from "sonner";
import {
  useCallback,
  useId,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
  type Ref,
} from "react";

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
import { useGridPagination, type PaginationProp } from "./hooks/useGridPagination";
import { useGridRows } from "./hooks/useGridRows";
import { useRowSelection } from "./hooks/useRowSelection";
import type { WithMeta } from "./types/column";
import type { GroupOption } from "./types/grouping";
import { CardsView } from "./ui/CardsView";
import { ColumnsPopover } from "./ui/ColumnsPopover";
import { DataGridPagination } from "./ui/DataGridPagination";
import { DataGridToolbar } from "./ui/DataGridToolbar";
import { FacetChips } from "./ui/FacetChips";
import { Spinner } from "./ui/GridStates";
import { KanbanView } from "./ui/KanbanView";
import { SelectionPill } from "./ui/SelectionPill";
import { TableView } from "./ui/TableView";
import {
  EditContainer,
  type EditContainerKind,
} from "./ui/containers/EditContainers";
import { EditInline } from "./ui/containers/EditInline";
import { CellEditPopover } from "./ui/table/CellEditPopover";
import type { ActionColumnOpts } from "./ui/makeActionColumns";
import { computeDefaults } from "./utils/getAccessorKey";
import { getRowKey } from "./utils/getRowKey";

export type DataGridProps<TRow extends object, TForm extends object = TRow> = {
  title?: string;
  /** Faint one-liner rendered next to the title. */
  subtitle?: string;
  /** Toolbar search across all columns. Default true. */
  searchable?: boolean;
  /** Title of the empty state ("No data" when omitted). */
  emptyLabel?: string;
  /** Supplying this enables the list/cards segment toggle in the toolbar. */
  card?: (row: TRow) => ReactNode;
  defaultView?: "list" | "cards";
  /** Supplying these enables the toolbar Group-by select. */
  groupOptions?: GroupOption[];
  defaultGroupBy?: string;
  /** Leading checkbox column with page-scoped select-all and a bulk footer pill. */
  selectable?: boolean;
  /** Fires with the currently selected row objects whenever the selection changes. */
  onSelectionChange?: (rows: TRow[]) => void;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  initialData: TRow[];
  idAccessor?: (r: TRow) => string | number | undefined;
  editContainer?: EditContainerKind;
  onPersist?: (
    mode: "create" | "edit" | "cell",
    values: TForm,
    prev?: TRow
  ) => Promise<TRow> | TRow;
  onDelete?: (row: TRow) => Promise<void> | void;
  className?: string;
  toolbar?: ReactNode;
  isLoading?: boolean;
  error?: string | Error | null;
  onRetry?: () => void | Promise<void>;
  actionColumnOptions?: Partial<ActionColumnOpts<TRow>>;
  pagination?: PaginationProp;
  initialSorting?: SortingState; // Initial sorting state
  storageKey?: string;
  formLayout?: {
    columns?: 1 | 2 | 3 | 4; // Number of columns in the grid (default: 2)
    gap?: string; // Gap between fields (default: "gap-4")
    className?: string; // Additional classes for the form container
  };
  onRowClick?: (row: TRow) => void;
  renderExpandedRow?: (row: TRow) => ReactNode;
  /**
   * Row expansion is fully controlled: the grid renders the panel for every id in this
   * set and owns nothing else about it. The toggle affordance is yours to place — a
   * chevron in one of your own columns, or `onRowClick`.
   *
   * (`onToggleExpanded` used to sit alongside this. It was declared in the props type
   * and never read anywhere in the grid, so nothing could ever call it.)
   */
  expandedRowIds?: ReadonlySet<string | number>;
  /**
   * Imperative control. Replaces `cancelEditTrigger` / `onEditStart` / `onCancelEdit` —
   * a number the parent had to bump, plus two callbacks whose only job was to mirror
   * state the grid already owns. See {@link DataGridHandle}.
   */
  ref?: Ref<DataGridHandle<TRow>>;
};

/**
 * What a parent can ask the grid to do.
 *
 * ```tsx
 * const grid = useRef<DataGridHandle<User>>(null);
 * grid.current?.startCreate();
 * grid.current?.cancelEdit();
 * ```
 */
export type DataGridHandle<TRow extends object> = {
  /** Open the create form. */
  startCreate: () => void;
  /** Open the edit form for a row. */
  startEdit: (row: TRow) => void;
  /** Close whatever editor is open — form or cell popover. No-op when idle. */
  cancelEdit: () => void;
  /** True while a create/edit form or a cell popover is open. */
  isEditing: () => boolean;
  /** Clear the checkbox selection. */
  clearSelection: () => void;
};

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
 * `useGridColumns`, `useGridGrouping`, `useDataGridTable` — because when all of it lived
 * here as thirteen independent `useState`s, facts about the same thing drifted apart
 * from each other (the drawer that outlived its edit session being the clearest case).
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

  const getId = useCallback(
    (r: TRow) => getRowKey(r, idAccessor),
    [idAccessor]
  );

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

  const userKey =
    storageKey ?? `dg:${title.toLowerCase().replace(/\s+/g, "-")}`;

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

  const handleDelete = useCallback(
    async (row: TRow) => {
      if (!onDelete) return;
      const ok = await confirm({
        title: "Delete this item?",
        description: "This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        isDestructive: true,
      });
      if (!ok) return;
      await onDelete(row);
      // Errors deliberately propagate: the action button owns the catch, the toast and
      // its own spinner state.
      removeRow(row);
      selection.deselect(getId(row));
    },
    [onDelete, confirm, removeRow, selection, getId]
  );

  const handleSubmit = useCallback(
    async (values: TForm) => {
      if (!onPersist) return;
      try {
        // Reflect the result locally. A consumer using the query adapter will re-supply
        // `initialData` and overwrite this with server truth; a plain `onPersist`
        // consumer would otherwise see nothing happen at all.
        const editingRow = edit.editingRow;
        if (editingRow) {
          const saved = await onPersist("edit", values, editingRow);
          if (saved) replaceRow(editingRow, saved);
        } else {
          const created = await onPersist("create", values);
          if (created) addRow(created);
        }
        edit.close();
      } catch (e) {
        toast.error(getApiMessage(e, "Save failed"));
        throw e;
      }
    },
    [onPersist, edit, replaceRow, addRow]
  );

  const cellEditColumn = useMemo(
    () =>
      edit.cell
        ? columns.find((c) => getColId(c) === edit.cell!.columnId)
        : undefined,
    [edit.cell, columns]
  );

  const handleCellSave = useCallback(
    async (value: unknown) => {
      const cell = edit.cell;
      if (!onPersist || !cell || !cellEditColumn) return;
      const key = cell.columnId;
      const prevRow = cell.row;

      /*
       * Exactly the full form's round-trip, on one field: put the row through `toForm`
       * to get form-shaped values, swap in what the popover produced, then run every
       * column's `fromForm` back the other way.
       *
       * Doing this needed the §3.6 split. While `parse` was the only hook, running it
       * over the other fields would have double-converted them — they held stored row
       * values, not form values — so the cell path could only ever convert the one field
       * and sent the rest in whatever shape they happened to be in.
       */
      const formDraft: Record<string, unknown> = {
        ...(computeDefaults(prevRow as never, columns as never) as object),
        [key]: value,
      };
      const draft: Record<string, unknown> = { ...formDraft };
      for (const c of columns) {
        const colKey = (c as { accessorKey?: string }).accessorKey;
        if (!colKey || !c.meta?.fromForm) continue;
        draft[colKey] = c.meta.fromForm(formDraft[colKey], formDraft as TForm);
      }

      // Validate just this field: a full-schema failure on some OTHER field must not
      // block editing this one.
      const result = (
        zodSchema as unknown as {
          safeParse?: (v: unknown) => {
            success: boolean;
            data?: unknown;
            error: { issues: { path: (string | number)[]; message: string }[] };
          };
        }
      ).safeParse?.(draft);
      if (result && !result.success) {
        const own = result.error.issues.find((i) => String(i.path[0]) === key);
        if (own) throw new Error(own.message);
      }

      /*
       * Prefer zod's OUTPUT to the raw draft. Only `success` used to be read, so a schema
       * doing `z.string().transform(Number)` persisted the untransformed string — and
       * because an object schema strips unknown keys, the parsed value is genuinely
       * `TForm`-shaped rather than the row-shaped payload the cast used to claim.
       * The draft is the fallback when the schema rejected some unrelated field.
       */
      const payload = (result?.success ? result.data : draft) as TForm;

      const saved = await onPersist("cell", payload, prevRow);
      if (saved) replaceRow(prevRow, saved);
      edit.close();
    },
    [onPersist, edit, cellEditColumn, columns, zodSchema, replaceRow]
  );

  const startCellEditFromCell = useCallback(
    (row: unknown, columnId: string, cellEl: HTMLElement) => {
      if (!onPersist) return;
      const r = cellEl.getBoundingClientRect();
      edit.startCellEdit(row as TRow, columnId, {
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        width: r.width,
      });
    },
    [onPersist, edit]
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
    () =>
      filters.buildFacetChips(grouping.activeGroupOption, grouping.clearGroupBy),
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

          <div
            className="relative overflow-x-auto overflow-y-visible isolate w-full"
            aria-busy={!!isLoading}
          >
            {isLoading && (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-surface-card/50">
                <div className="pointer-events-auto rounded-control border border-border-default bg-surface-card px-3 py-2 shadow-[var(--elev-1)]">
                  <Spinner label="Loading…" />
                </div>
              </div>
            )}

            {showCards && grouping.groups ? (
              // Cards + group-by renders as kanban columns, per spec.
              <KanbanView
                groups={grouping.groups}
                getId={getId}
                card={card!}
                selectedRowIds={selectable ? selection.selectedIds : undefined}
                onRowClick={onRowClick ? handleRowClick : undefined}
              />
            ) : showCards ? (
              <CardsView
                table={table}
                getId={getId}
                card={card!}
                isLoading={isLoading ?? false}
                error={error ?? null}
                emptyLabel={emptyLabel}
                selectedRowIds={selectable ? selection.selectedIds : undefined}
                onRowClick={onRowClick ? handleRowClick : undefined}
              />
            ) : (
              <TableView
                table={table}
                getId={getId}
                isLoading={isLoading ?? false}
                error={error ?? null}
                label={title}
                showFilters={filters.showFilters && filters.hasFilterableColumns}
                emptyLabel={emptyLabel}
                selectedRowIds={selectable ? selection.selectedIds : undefined}
                groups={grouping.groups}
                collapsedGroups={grouping.collapsedGroups}
                onToggleGroup={grouping.toggleGroup}
                editingRowId={
                  inlineEditing && edit.editingRow
                    ? getId(edit.editingRow)
                    : undefined
                }
                inlineEditor={inlineEditor}
                isCreating={inlineEditing && edit.session.kind === "create"}
                selectedRowId={selectedRowId}
                onRowClick={onRowClick ? handleRowClick : undefined}
                expandedRowIds={expandedRowIds}
                renderExpandedRow={renderExpandedRow}
              />
            )}
          </div>

          {/* Pagination applies to the ungrouped list view only. The cards grid shows the
              whole filtered set and grouping replaces pagination outright, so a pager under
              either would be lying — grouping keeps the footer for the total. */}
          {pagination.enabled && !showCards && (
            <DataGridPagination
              table={table}
              /* The FILTERED count, not rows.length — otherwise page counts and the
                 "X to Y of Z" range ignore any active column filter. */
              totalCount={table.getFilteredRowModel().rows.length}
              selectedCount={selectable ? selection.selectedIds.size : 0}
              onClearSelection={selectable ? selection.clear : undefined}
              totalOnly={!!grouping.groups}
              pageSizeOptions={pagination.pageSizeOptions}
            />
          )}

          {/* Cards view has no pager, but the bulk pill still needs somewhere to live. */}
          {showCards && selectable && selection.selectedIds.size > 0 && (
            <div className="flex items-center gap-3 border-t border-border-default bg-surface-card px-3.5 py-[9px] text-[.75rem] text-muted">
              <SelectionPill
                count={selection.selectedIds.size}
                onClear={selection.clear}
              />
              <span className="text-[.75rem] text-muted">
                {table.getFilteredRowModel().rows.length} shown
              </span>
            </div>
          )}

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
