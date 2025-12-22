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
import { toast } from "sonner";
import { getApiMessage } from "../../api/errors";
import { useConfirm } from "./hooks/useConfirm";
import { Spinner } from "./ui/GridStates";
import { TableDesktopView } from "./ui/TableDesktopView";
import { TableMobileView } from "./ui/TableMobileView";
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
import { Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { DataGridContext } from "./DataGridContext";
import { useId } from "react";

export type DataGridProps<TRow extends object, TForm extends object = TRow> = {
  title?: string;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  initialData: TRow[];
  idAccessor?: (r: TRow) => string | number | undefined;
  editContainer?: EditContainerKind;
  onPersist?: (
    mode: "create" | "edit",
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
const EMPTY_EXPANDED_SET = new Set<string | number>();

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export function DataGrid<TRow extends object, TForm extends object = TRow>({
  title = "Data",
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
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const [selectedRowId, setSelectedRowId] = useState<
    string | number | undefined
  >(undefined);

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
  useEffect(() => setRows(initialData ?? []), [initialData]);

  // Cancel editing when cancelEditTrigger changes (and is > 0)
  const prevCancelTriggerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      cancelEditTrigger !== undefined &&
      cancelEditTrigger > 0 &&
      prevCancelTriggerRef.current !== cancelEditTrigger &&
      editing !== null
    ) {
      prevCancelTriggerRef.current = cancelEditTrigger;
      setEditing(null);
      onCancelEdit?.();
    }
  }, [cancelEditTrigger, editing, onCancelEdit]);

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

      try {
        await onDelete(row);
      } catch (e) {
        throw e;
      }
    },
    [onDelete, getId, confirm]
  );

  const processedColumns = useMemo(() => columns, [columns]);

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
    () => processedColumns.filter((c) => getColId(c) !== "__actions__"),
    [processedColumns]
  );
  const allColumnIds = useMemo(
    () => [...baseCols.map(getColId), "__actions__"],
    [baseCols]
  );

  const { state: colState, handlers: colHandlers } = useColumnPrefs(
    userKey,
    allColumnIds
  );

  const orderedColumns = useMemo(() => {
    const byId = new Map<string, any>();
    for (const c of baseCols) byId.set(getColId(c), c);
    byId.set("__actions__", actionCol);
    return colState.columnOrder
      .map((id) => byId.get(id))
      .filter(Boolean) as typeof columns;
  }, [baseCols, actionCol, colState.columnOrder]);

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
    state: {
      columnSizing: colState.columnSizing,
      columnVisibility: colState.columnVisibility,
      columnOrder: colState.columnOrder,
      columnFilters,
      sorting,
      ...(paginationEnabled ? { pagination } : {}),
    },
    onColumnSizingChange: colHandlers.onColumnSizingChange,
    onColumnVisibilityChange: colHandlers.onColumnVisibilityChange,
    onColumnOrderChange: colHandlers.onColumnOrderChange,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    ...(paginationEnabled ? { onPaginationChange: setPagination } : {}),
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });
  useEffect(() => {
    if (!paginationEnabled) return;
    onPaginationChange((prev) => ({ ...prev, pageIndex: 0 }));
  }, [columnFilters, sorting, paginationEnabled, onPaginationChange]);

  const handleSubmit = useCallback(
    async (values: TForm) => {
      try {
        if (!onPersist) return;
        if (editing?.mode === "edit" && editing.row) {
          const prevRow = editing.row;
          await onPersist("edit", values, prevRow);
        } else {
          await onPersist("create", values);
        }
        setOpen(false);
        setEditing(null);
        onCancelEdit?.();
      } catch (e) {
        throw e;
      }
    },
    [editing, onPersist, getId, onCancelEdit]
  );

  const leafColCount = useMemo(() => {
    const cols = [...columns, actionCol];
    return cols.length;
  }, [columns, actionCol]);

  const tooltipId = useId().replace(/:/g, "_");

  const contextValue = useMemo(() => ({ tooltipId }), [tooltipId]);

  return (
    <DataGridContext.Provider value={contextValue}>
      <div
        className={["flex flex-col rounded-lg border bg-white", className]
          .filter(Boolean)
          .join(" ")}
      >
        <DataGridToolbar
          title={title}
          toolbar={toolbar}
          editContainer={editContainer}
          error={error ?? null}
          onAddClick={handleCreate}
          onRetry={onRetry}
        />

        <div
          className="relative overflow-x-auto overflow-y-visible isolate w-full"
          aria-busy={!!isLoading}
        >
          {isLoading && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-white/50">
              <div className="pointer-events-auto rounded-md border bg-white px-3 py-2 shadow-sm">
                <Spinner label="Loading…" />
              </div>
            </div>
          )}

          <TableDesktopView
            table={table}
            getId={getId}
            isLoading={isLoading ?? false}
            rows={rows}
            error={error ?? null}
            leafColCount={leafColCount}
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

          {/* <TableMobileView
            table={table}
            getId={getId}
            isLoading={isLoading ?? false}
            rows={rows}
            error={error ?? null}
            selectedRowId={selectedRowId}
            onRowClick={onRowClick ? handleRowClick : undefined}
          /> */}
        </div>
        {paginationEnabled && (
          <DataGridPagination
            table={table}
            totalCount={rows.length}
            pageSizeOptions={
              paginationProp?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS
            }
            tableState={table.getState()}
          />
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
        {ConfirmDialog}
        <Tooltip id={tooltipId} />
      </div>
    </DataGridContext.Provider>
  );
}
