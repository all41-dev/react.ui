import type { SortingState } from "@tanstack/react-table";
import type { ReactNode, Ref } from "react";
import type { ZodType } from "zod";

import type { PaginationProp } from "../hooks/useGridPagination";
import type { EditContainerKind } from "../ui/containers/EditContainers";
import type { ActionColumnOpts } from "../ui/makeActionColumns";
import type { WithMeta } from "./column";
import type { GroupOption } from "./grouping";
import type { FormLayoutConfig } from "./formLayout";

/* The grid's public surface. Also re-exported from DataGrid.tsx, so either import
   path works. */

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
  formLayout?: FormLayoutConfig;
  onRowClick?: (row: TRow) => void;
  /**
   * Fires whenever the grid opens, swaps or closes an editor — the read side of what
   * {@link DataGridHandle} drives. Closing reports `{ kind: "idle" }`; unmounting the
   * grid does not, so a parent that unmounts it mid-session resets its own state.
   */
  onEditStateChange?: (state: EditState<TRow>) => void;
  renderExpandedRow?: (row: TRow) => ReactNode;
  /**
   * Row expansion is fully controlled: the grid renders a panel for every id in this set
   * and owns nothing else about it. Placing the toggle is up to you — a chevron in one of
   * your own columns, or `onRowClick`.
   */
  expandedRowIds?: ReadonlySet<string | number>;
  /** Imperative control over the edit session and selection. See {@link DataGridHandle}. */
  ref?: Ref<DataGridHandle<TRow>>;
};

/**
 * What the grid is editing, as reported to `onEditStateChange`. The cell state carries
 * the column being edited; the popover's own position is not part of it.
 */
export type EditState<TRow> =
  | { kind: "idle" }
  | { kind: "create" }
  | { kind: "edit"; row: TRow }
  | { kind: "cell"; row: TRow; columnId: string };

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
