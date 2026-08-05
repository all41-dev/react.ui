import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  getFilteredRowModel,
  type PaginationState,
  getPaginationRowModel,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import type { ZodType } from "zod";

import type { WithMeta } from "./types/column";
import {
  makeActionColumn,
  type ActionColumnOpts,
} from "./ui/makeActionColumns";
import {
  EditContainer,
  type EditContainerKind,
} from "./ui/containers/EditContainers";
import { EditInline } from "./ui/containers/EditInline";
import { getRowKey } from "./utils/getRowKey";
import { makeSelectColumn } from "./ui/table/SelectionCells";
import { toast } from "sonner";
import { getApiMessage } from "../../api/errors";
import { useConfirm } from "./hooks/useConfirm";
import { Spinner } from "./ui/GridStates";
import { TableView } from "./ui/TableView";
import { DataGridToolbar } from "./ui/DataGridToolbar";
import { useColumnPrefs } from "./hooks/useColumnPrefs";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { DataGridPagination } from "./ui/DataGridPagination";
import { FacetChips, type FacetChip } from "./ui/FacetChips";
import { CardsView } from "./ui/CardsView";
import {
  CellEditPopover,
  type CellEditState,
} from "./ui/table/CellEditPopover";
import { Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { DataGridContext } from "./DataGridContext";
import { useId } from "react";

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
  pagination?: {
    enabled?: boolean; // default true
    pageSizeOptions?: number[]; // default [5,10,20,50,100]
    initialState?: Partial<PaginationState>; // default { pageIndex:0, pageSize:10 }
    state?: PaginationState;
    onChange?: OnChangeFn<PaginationState>;
  };
  initialSorting?: SortingState; // Initial sorting state
  storageKey?: string;
  formLayout?: {
    columns?: 1 | 2 | 3 | 4; // Number of columns in the grid (default: 2)
    gap?: string; // Gap between fields (default: "gap-4")
    className?: string; // Additional classes for the form container
  };
  onRowClick?: (row: TRow) => void;
  renderExpandedRow?: (row: TRow) => ReactNode;
  expandedRowIds?: Set<string | number>;
  onToggleExpanded?: (rowId: string | number) => void;
  onEditStart?: (rowId: string | number) => void;
  onCancelEdit?: () => void;
  cancelEditTrigger?: number; // When this changes, cancel editing
};

const getColId = (c: any) => (c.id ?? c.accessorKey ?? "").toString();

/** Row ids arrive as string | number depending on the accessor; compare them as text. */
const sameRowId = (a: string | number | undefined, b: string | number | undefined) =>
  a !== undefined && b !== undefined && String(a) === String(b);
const EMPTY_EXPANDED_SET = new Set<string | number>();

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export function DataGrid<TRow extends object, TForm extends object = TRow>({
  title = "Data",
  subtitle,
  searchable = true,
  emptyLabel,
  card,
  defaultView = "list",
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
  onEditStart,
  onCancelEdit,
  cancelEditTrigger,
}: DataGridProps<TRow, TForm>) {
  const [rows, setRows] = useState<TRow[]>(() => initialData ?? []);
  const [editing, setEditing] = useState<{
    mode: "create" | "edit";
    row?: TRow;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<"list" | "cards">(defaultView);
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const [selectedRowId, setSelectedRowId] = useState<
    string | number | undefined
  >(undefined);
  // Checkbox selection (multi), ids stored as strings. Survives paging and filtering.
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  // Single-cell edit popover (columns with `cellEdit` meta).
  const [cellEdit, setCellEdit] = useState<CellEditState<TRow> | null>(null);

  // Use external expandedRowIds if provided, otherwise use empty set
  // (Internal state management removed since expansion is controlled from column buttons)
  const expandedRowIds = externalExpandedRowIds ?? EMPTY_EXPANDED_SET;
  const paginationEnabled = paginationProp?.enabled ?? true;
  const [uncontrolledPagination, setUncontrolledPagination] =
    useState<PaginationState>({
      pageIndex: paginationProp?.initialState?.pageIndex ?? 0,
      pageSize: paginationProp?.initialState?.pageSize ?? 10,
    });

  const pagination = paginationProp?.state ?? uncontrolledPagination;
  const onPaginationChange: OnChangeFn<PaginationState> =
    paginationProp?.onChange ?? setUncontrolledPagination;
  const setPagination = paginationProp?.onChange ?? setUncontrolledPagination;

  /*
   * `rows` is seeded from `initialData` and then owned locally so create/edit/delete can
   * be reflected immediately (see handleSubmit / handleDelete). Reconciled during render
   * rather than in an effect: no extra render pass, and no window in which the grid shows
   * data the parent has already replaced.
   *
   * `initialData` must be a stable reference — the same contract TanStack Table places on
   * its own `data` prop. Rebuilding the array inline on every render discards any pending
   * local mutation.
   */
  const [syncedData, setSyncedData] = useState(initialData);
  if (initialData !== syncedData) {
    setSyncedData(initialData);
    setRows(initialData ?? []);
    // Prune the checkbox selection to ids that still exist: a refetch keeps the
    // selection, a dataset swap effectively clears it.
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const alive = new Set(
        (initialData ?? []).map((r) => String(getRowKey(r, idAccessor)))
      );
      const next = new Set([...prev].filter((id) => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }

  /*
   * `cancelEditTrigger` is an imperative signal: the parent bumps the number to cancel.
   * The ref is seeded with the incoming value so mounting never counts as a change, and
   * it advances on EVERY change rather than only while something is being edited —
   * otherwise a bump that arrives with no editor open leaves the ref stale, and the next
   * editor the user opens is cancelled the moment it appears.
   */
  const prevCancelTriggerRef = useRef<number | undefined>(cancelEditTrigger);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  useEffect(() => {
    if (prevCancelTriggerRef.current === cancelEditTrigger) return;
    prevCancelTriggerRef.current = cancelEditTrigger;
    if (cancelEditTrigger === undefined || cancelEditTrigger <= 0) return;
    if (editingRef.current === null) return;
    setEditing(null);
    onCancelEdit?.();
  }, [cancelEditTrigger, onCancelEdit]);

  const getId = useCallback(
    (r: TRow) => getRowKey(r, idAccessor),
    [idAccessor]
  );

  const handleRowClick = useCallback(
    (row: TRow) => {
      const rowId = getId(row);
      setSelectedRowId((prev) => {
        if (prev !== undefined && String(prev) === String(rowId)) {
          return undefined;
        }
        return rowId;
      });

      onRowClick?.(row);
    },
    [getId, onRowClick]
  );

  const toggleRowSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setPageSelected = useCallback((pageIds: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Notify the consumer with row objects (not ids). Refs keep this effect off the
  // rows/callback identities; the initial empty selection is not announced.
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const selectionAnnouncedRef = useRef(false);
  useEffect(() => {
    if (!selectionAnnouncedRef.current) {
      selectionAnnouncedRef.current = true;
      if (selectedIds.size === 0) return;
    }
    onSelectionChangeRef.current?.(
      rowsRef.current.filter((r) => selectedIds.has(String(getId(r))))
    );
  }, [selectedIds, getId]);

  const handleCreate = useCallback(() => {
    setEditing({ mode: "create" });
    if (editContainer !== "none" && editContainer !== "inline") setOpen(true);
  }, [editContainer]);

  const handleEdit = useCallback(
    (row: TRow) => {
      const rowId = getId(row);
      setEditing({ mode: "edit", row });
      if (editContainer !== "none" && editContainer !== "inline") setOpen(true);
      if (rowId !== undefined) {
        onEditStart?.(rowId);
      }
    },
    [editContainer, getId, onEditStart]
  );

  const { confirm, ConfirmDialog } = useConfirm();

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
      // Drop the row locally so a plain `onDelete` consumer (no query adapter re-supplying
      // `initialData`) doesn't watch a successfully deleted row stay on screen.
      // Errors deliberately propagate: the action button owns the catch, the toast and
      // its own spinner state.
      const deletedId = getId(row);
      setRows((prev) => prev.filter((r) => !sameRowId(getId(r), deletedId)));
      if (deletedId !== undefined) {
        setSelectedIds((prev) => {
          if (!prev.has(String(deletedId))) return prev;
          const next = new Set(prev);
          next.delete(String(deletedId));
          return next;
        });
      }
    },
    [onDelete, getId, confirm]
  );



  const actionCol = useMemo(
    () =>
      makeActionColumn<TRow>({
        presentation: "overlay",
        getId,
        onEdit: handleEdit,
        onDelete: onDelete ? handleDelete : undefined,
        onError: (err) => toast.error(getApiMessage(err, "Delete failed")),
        labels: {
          edit: <Pencil className="h-4 w-4" aria-hidden />,
          delete: <Trash2 className="h-4 w-4" aria-hidden />,
        },
        ...actionColumnOptions,
      }),
    [getId, handleEdit, handleDelete, onDelete, actionColumnOptions]
  );

  const userKey =
    storageKey ?? `dg:${title.toLowerCase().replace(/\s+/g, "-")}`;
  const baseCols = useMemo(
    () => columns.filter((c) => getColId(c) !== "__actions__"),
    [columns]
  );
  const selectCol = useMemo(
    () =>
      selectable
        ? makeSelectColumn<TRow>({
            getId,
            selectedIds,
            onToggleRow: toggleRowSelected,
            onSetPage: setPageSelected,
          })
        : null,
    [selectable, getId, selectedIds, toggleRowSelected, setPageSelected]
  );

  const allColumnIds = useMemo(
    () => [
      ...(selectable ? ["__select__"] : []),
      ...baseCols.map(getColId),
      "__actions__",
    ],
    [baseCols, selectable]
  );

  const { state: colState, handlers: colHandlers } = useColumnPrefs(
    userKey,
    allColumnIds
  );

  const orderedColumns = useMemo(() => {
    const byId = new Map<string, any>();
    for (const c of baseCols) byId.set(getColId(c), c);
    byId.set("__actions__", actionCol);
    if (selectCol) byId.set("__select__", selectCol);
    return colState.columnOrder
      .map((id) => byId.get(id))
      .filter(Boolean) as typeof columns;
  }, [baseCols, actionCol, selectCol, colState.columnOrder]);

  const defaultColumn = useMemo(
    () => ({
      enableResizing: true,
      minSize: 40,
      size: 150,
      maxSize: 1000,
    }),
    []
  );

  const coreRowModel = useMemo(() => getCoreRowModel(), []);
  const sortedRowModel = useMemo(() => getSortedRowModel(), []);
  const filteredRowModel = useMemo(() => getFilteredRowModel(), []);
  const paginationRowModel = useMemo(() => getPaginationRowModel(), []);

  const table = useReactTable({
    data: rows,
    columns: orderedColumns,
    getCoreRowModel: coreRowModel,
    getSortedRowModel: sortedRowModel,
    getFilteredRowModel: filteredRowModel,
    ...(paginationEnabled ? { getPaginationRowModel: paginationRowModel } : {}),
    defaultColumn,
    columnResizeMode: "onChange",
    columnResizeDirection: "ltr",
    // Toolbar search: contains, case-insensitive, across every globally-filterable
    // column — the built-in fn reads each column's accessor, which is the spec's
    // "uses column.value(row) when defined".
    globalFilterFn: "includesString",
    state: {
      columnSizing: colState.columnSizing,
      columnVisibility: colState.columnVisibility,
      columnOrder: colState.columnOrder,
      columnFilters,
      globalFilter,
      sorting,
      ...(paginationEnabled ? { pagination } : {}),
    },
    onColumnSizingChange: colHandlers.onColumnSizingChange,
    onColumnVisibilityChange: colHandlers.onColumnVisibilityChange,
    onColumnOrderChange: colHandlers.onColumnOrderChange,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    ...(paginationEnabled ? { onPaginationChange: setPagination } : {}),
  });
  /*
   * Filtering or sorting should send the user back to page 1 — but only when they
   * actually change. Seeding the ref with the current values keeps this from firing on
   * mount, which previously stomped a controlled parent's initial pageIndex, and the
   * identity check keeps it from calling the parent's onChange for a no-op.
   */
  const prevFilterSortRef = useRef({ columnFilters, globalFilter, sorting });
  useEffect(() => {
    if (!paginationEnabled) return;
    const prev = prevFilterSortRef.current;
    if (
      prev.columnFilters === columnFilters &&
      prev.globalFilter === globalFilter &&
      prev.sorting === sorting
    )
      return;
    prevFilterSortRef.current = { columnFilters, globalFilter, sorting };
    onPaginationChange((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [columnFilters, globalFilter, sorting, paginationEnabled, onPaginationChange]);

  const handleSubmit = useCallback(
    async (values: TForm) => {
      if (!onPersist) return;
      try {
        // Reflect the result locally. A consumer using the query adapter will re-supply
        // `initialData` and overwrite this with server truth; a plain `onPersist`
        // consumer would otherwise see nothing happen at all.
        if (editing?.mode === "edit" && editing.row) {
          const prevRow = editing.row;
          const saved = await onPersist("edit", values, prevRow);
          const prevId = getId(prevRow);
          if (saved) {
            setRows((prev) =>
              prev.map((r) => (sameRowId(getId(r), prevId) ? saved : r))
            );
          }
        } else {
          const created = await onPersist("create", values);
          if (created) setRows((prev) => [...prev, created]);
        }
        setOpen(false);
        setEditing(null);
        onCancelEdit?.();
      } catch (e) {
        toast.error(getApiMessage(e, "Save failed"));
        throw e;
      }
    },
    [editing, onPersist, getId, onCancelEdit]
  );

  const startCellEdit = useCallback(
    (row: unknown, columnId: string, cellEl: HTMLElement) => {
      const r = cellEl.getBoundingClientRect();
      setCellEdit({
        row: row as TRow,
        columnId,
        anchor: { top: r.top, bottom: r.bottom, left: r.left, width: r.width },
      });
    },
    []
  );

  const cellEditColumn = useMemo(
    () =>
      cellEdit
        ? columns.find((c) => getColId(c) === cellEdit.columnId)
        : undefined,
    [cellEdit, columns]
  );

  const handleCellSave = useCallback(
    async (value: unknown) => {
      if (!onPersist || !cellEdit || !cellEditColumn) return;
      const key = cellEdit.columnId;
      const meta = cellEditColumn.meta;
      const prevRow = cellEdit.row;
      const parsed = meta?.parse
        ? meta.parse(value, { ...(prevRow as any), [key]: value })
        : value;
      const candidate = { ...(prevRow as any), [key]: parsed };

      // Validate just this field: a full-schema failure on some OTHER field must not
      // block editing this one.
      const result = (zodSchema as any).safeParse?.(candidate);
      if (result && !result.success) {
        const own = result.error.issues.find(
          (i: { path: (string | number)[] }) => String(i.path[0]) === key
        );
        if (own) throw new Error(own.message);
      }

      const saved = await onPersist("cell", candidate as TForm, prevRow);
      const prevId = getId(prevRow);
      if (saved) {
        setRows((prev) =>
          prev.map((r) => (sameRowId(getId(r), prevId) ? saved : r))
        );
      }
      setCellEdit(null);
    },
    [onPersist, cellEdit, cellEditColumn, zodSchema, getId]
  );

  const leafColCount = useMemo(() => {
    const cols = [...columns, actionCol];
    return cols.length + (selectable ? 1 : 0);
  }, [columns, actionCol, selectable]);

  const showCards = !!card && view === "cards";

  const hasFilterableColumns = useMemo(
    () => baseCols.some((c) => (c as any).meta?.filter),
    [baseCols]
  );

  // One chip per active criterion: search first, then each column filter.
  const facetChips = useMemo<FacetChip[]>(() => {
    const labelOf = (id: string) => {
      const col = baseCols.find((c) => getColId(c) === id) as any;
      const header = col?.header;
      return col?.meta?.label ?? (typeof header === "string" ? header : id);
    };
    const valueOf = (v: unknown): string => {
      if (Array.isArray(v)) return v.join(", ");
      if (typeof v === "boolean") return v ? "Yes" : "No";
      if (v && typeof v === "object") {
        const r = v as { from?: string; to?: string };
        return [r.from, r.to].filter(Boolean).join(" → ");
      }
      return String(v ?? "");
    };
    const chips: FacetChip[] = [];
    if (globalFilter.trim() !== "") {
      chips.push({
        id: "__search__",
        label: "Search",
        value: globalFilter,
        onClear: () => setGlobalFilter(""),
      });
    }
    for (const f of columnFilters) {
      chips.push({
        id: f.id,
        label: labelOf(f.id),
        value: valueOf(f.value),
        onClear: () =>
          setColumnFilters((prev) => prev.filter((x) => x.id !== f.id)),
      });
    }
    return chips;
  }, [globalFilter, columnFilters, baseCols]);

  const tooltipId = useId().replace(/:/g, "_");

  const contextValue = useMemo(
    () => ({
      tooltipId,
      startCellEdit: onPersist ? startCellEdit : undefined,
    }),
    [tooltipId, startCellEdit, onPersist]
  );

  return (
    <DataGridContext.Provider value={contextValue}>
      <div
        className={["flex flex-col rounded-lg border bg-surface-card", className]
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
          onAddClick={handleCreate}
          onRetry={onRetry}
          searchable={searchable}
          searchValue={globalFilter}
          onSearchChange={setGlobalFilter}
          hasFilterableColumns={hasFilterableColumns}
          filtersShown={showFilters}
          activeFilterCount={columnFilters.length}
          onToggleFilters={() => setShowFilters((v) => !v)}
          view={card ? view : undefined}
          onViewChange={card ? setView : undefined}
        />

        <FacetChips chips={facetChips} />

        <div
          className="relative overflow-x-auto overflow-y-visible isolate w-full"
          aria-busy={!!isLoading}
        >
          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-surface-card/50">
              <div className="pointer-events-auto rounded-md border bg-surface-card px-3 py-2 shadow-sm">
                <Spinner label="Loading…" />
              </div>
            </div>
          )}

          {showCards ? (
            <CardsView
              table={table}
              getId={getId}
              card={card!}
              isLoading={isLoading ?? false}
              error={error ?? null}
              emptyLabel={emptyLabel}
              selectedRowIds={selectable ? selectedIds : undefined}
              onRowClick={onRowClick ? handleRowClick : undefined}
            />
          ) : (
          <TableView
            table={table}
            getId={getId}
            isLoading={isLoading ?? false}
            rows={rows}
            error={error ?? null}
            leafColCount={leafColCount}
            showFilters={showFilters && hasFilterableColumns}
            emptyLabel={emptyLabel}
            selectedRowIds={selectable ? selectedIds : undefined}
            editingRowId={
              editContainer === "inline" &&
              editing?.mode === "edit" &&
              editing.row
                ? getId(editing.row)
                : undefined
            }
            inlineEditor={
              editContainer === "inline" && editing ? (
                <EditInline<TRow, TForm>
                  open={true}
                  mode={editing.mode}
                  row={editing.row}
                  columns={columns}
                  zodSchema={zodSchema}
                  formLayout={formLayout}
                  onCancel={() => {
                    setEditing(null);
                    onCancelEdit?.();
                  }}
                  onSubmit={handleSubmit}
                />
              ) : undefined
            }
            isCreating={
              editContainer === "inline" && editing?.mode === "create"
            }
            selectedRowId={selectedRowId}
            onRowClick={onRowClick ? handleRowClick : undefined}
            expandedRowIds={expandedRowIds}
            renderExpandedRow={renderExpandedRow}
          />
          )}
        </div>
        {/* Pagination applies to the list view only — the cards grid shows the whole
            filtered set, so a pager under it would be lying. */}
        {paginationEnabled && !showCards && (
          <DataGridPagination
            table={table}
            /* The FILTERED count, not rows.length — otherwise page counts and the
               "X to Y of Z" range ignore any active column filter. */
            totalCount={table.getFilteredRowModel().rows.length}
            selectedCount={selectable ? selectedIds.size : 0}
            onClearSelection={selectable ? clearSelection : undefined}
            pageSizeOptions={
              paginationProp?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS
            }
            tableState={table.getState()}
          />
        )}
        {/* Cards view has no pager, but the bulk pill still needs somewhere to live. */}
        {showCards && selectable && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 border-t border-border-default bg-surface-card px-3.5 py-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent py-0.5 pl-2.5 pr-1 text-[.6875rem] font-semibold text-accent-contrast">
              {selectedIds.size} selected
              <button
                type="button"
                onClick={clearSelection}
                className="cursor-pointer rounded-full px-1.5 font-medium underline-offset-2 transition-opacity hover:underline hover:opacity-90"
              >
                Clear
              </button>
            </span>
            <span className="text-xs text-muted">
              {table.getFilteredRowModel().rows.length} shown
            </span>
          </div>
        )}
        {editContainer !== "inline" && (
          <EditContainer<TRow, TForm>
            kind={editContainer}
            open={open}
            mode={editing?.mode ?? "create"}
            row={editing?.row}
            columns={columns}
            zodSchema={zodSchema}
            formLayout={formLayout}
            onCancel={() => {
              setOpen(false);
              setEditing(null);
            }}
            onSubmit={handleSubmit}
          />
        )}
        {cellEdit && cellEditColumn && (
          <CellEditPopover<TRow, TForm>
            state={cellEdit}
            column={cellEditColumn}
            onCancel={() => setCellEdit(null)}
            onSave={handleCellSave}
          />
        )}
        {ConfirmDialog}
        <Tooltip id={tooltipId} />
      </div>
    </DataGridContext.Provider>
  );
}
