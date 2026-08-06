import type { SortingState } from "@tanstack/react-table";
import type { ReactNode, Ref } from "react";
import type { ZodType } from "zod";

import type { PaginationProp } from "../hooks/useGridPagination";
import type { EditContainerKind } from "../ui/containers/EditContainers";
import type { ActionColumnOpts } from "../ui/makeActionColumns";
import type { WithMeta } from "./column";
import type { GroupOption } from "./grouping";

/*
 * The grid's public surface. Split out of DataGrid.tsx so that file is composition and
 * nothing else — these two types plus their documentation ran to ~95 lines, which is
 * most of what made it look large. Re-exported from DataGrid.tsx, so the published
 * import path (`@all41-dev/react.ui`) is unchanged.
 */

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
