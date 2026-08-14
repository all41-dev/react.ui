import { createContext, useContext } from "react";

import type { ActionColumnOpts, ActionView } from "./ui/makeActionColumns";

/**
 * Everything the injected select/action columns and the body cells need, delivered
 * through context instead of captured in column closures.
 *
 * Why it matters: a column def that closes over `getId`, `onEdit`, `selectedIds`… is a
 * new object whenever any of those change, and a new column array makes TanStack rebuild
 * its entire column model. `actionColumnOptions` is a `Partial<>` consumers pass inline,
 * so that was EVERY render; `selectedIds` is a fresh Set on every checkbox click. Read
 * here instead, the column defs depend only on the consumer's own `columns` array.
 *
 * Note what this does and does not buy: the context VALUE still changes when the grid's
 * own props do, and its consumers re-render — but they were re-rendering anyway. What
 * matters is that the column defs no longer change, so TanStack keeps its column model.
 *
 * Split in two so a body cell reading `tooltipId` doesn't re-render on every checkbox
 * click: only the selection cells subscribe to `DataGridSelectionContext`.
 */
export type DataGridContextValue = {
  /** react-tooltip anchor id owned by this grid instance. */
  tooltipId: string;
  /** Whether cell editing is possible at all — the grid needs an `onPersist` for it. */
  canCellEdit: boolean;
  /** Cells with `cellEdit` meta call this. No-op when `canCellEdit` is false. */
  startCellEdit: (row: unknown, columnId: string, cellEl: HTMLElement) => void;
  /** The grid's single row-identity rule (`idAccessor` → `id` → `uuid`). */
  getId: (row: unknown) => string | number | undefined;
  /** Row action handlers and labels, read at cell-render time rather than closed over. */
  rowActions: ActionColumnOpts<unknown>;
  /** The body currently on screen, forwarded into consumer `renderActions`. */
  view: ActionView;
};

export const DataGridContext = createContext<DataGridContextValue | null>(null);

export function useDataGridContext() {
  const ctx = useContext(DataGridContext);
  if (!ctx) {
    throw new Error("useDataGridContext must be used within a DataGrid");
  }
  return ctx;
}

export type DataGridSelectionValue = {
  /** Ids stored as strings — row ids are compared as text everywhere in this grid. */
  selectedIds: ReadonlySet<string>;
  toggleRow: (id: string) => void;
  /** Header checkbox: select or unselect exactly the ids it is given. */
  setPage: (pageIds: string[], selected: boolean) => void;
  /**
   * True when the body renders the whole filtered set rather than one page — grouping
   * replaces paging. The header checkbox scopes itself to what is on screen, so it must
   * follow this rather than always reading the paginated row model.
   */
  rendersAllRows: boolean;
};

export const DataGridSelectionContext =
  createContext<DataGridSelectionValue | null>(null);
