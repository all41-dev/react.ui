import { useCallback, useState } from "react";
import type { EditContainerKind } from "../ui/containers/EditContainers";
import type { ActionView } from "../ui/makeActionColumns";
import type { useEditSession } from "./useEditSession";

type Params<TRow extends object> = {
  hasCard: boolean;
  defaultView: "list" | "cards";
  editContainer: EditContainerKind;
  grouped: boolean;
  edit: ReturnType<typeof useEditSession<TRow>>;
  /** The grid's row identity — the same function the table gets as `getRowId`. */
  getKey: (row: TRow) => string;
  onRowClick?: (row: TRow) => void;
};

/**
 * The list/cards toggle, the single-row click selection, and the container fallback.
 * `inlineEditing` and `rowEditing` name the two containers that render inside the table
 * body: a form under the row, and editors in the row's own cells.
 */
export function useGridView<TRow extends object>({
  hasCard,
  defaultView,
  editContainer,
  grouped,
  edit,
  getKey,
  onRowClick,
}: Params<TRow>) {
  const [view, setView] = useState<"list" | "cards">(defaultView);
  const [selectedRowId, setSelectedRowId] = useState<string | undefined>(
    undefined
  );

  const { close: closeEdit, release } = edit;

  const showCards = hasCard && view === "cards";

  /*
   * Which body is actually on screen — "kanban" when cards meet a group-by. Handed to
   * consumer `renderActions` so a button whose target can't render in the current view
   * can hide or swap itself.
   */
  const activeView: ActionView = showCards
    ? grouped
      ? "kanban"
      : "cards"
    : "list";

  /*
   * "Inline" and "row" name table-row placements that have no cards equivalent. Left
   * as-is, a session started from cards had nowhere to render: the click looked dead and
   * the live session re-opened the editor on the next switch to list. In cards the same
   * session opens as a modal instead.
   */
  const inBody = editContainer === "inline" || editContainer === "row";
  const effectiveContainer: EditContainerKind =
    showCards && inBody ? "modal" : editContainer;
  const inlineEditing = effectiveContainer === "inline";
  const rowEditing = effectiveContainer === "row";

  const handleViewChange = useCallback(
    (v: "list" | "cards") => {
      // A session that straddles the toggle changes shell mid-flight (inline ↔ modal)
      // and loses its form state anyway when the host view unmounts — close it instead.
      closeEdit();
      setView(v);
    },
    [closeEdit]
  );

  const handleRowClick = useCallback(
    (row: TRow) => {
      /* Row mode: a click elsewhere is the user moving on. An untouched row closes; a
         dirty one keeps the click from landing, so two rows never both look current. */
      if (rowEditing && !release()) return;
      const key = getKey(row);
      setSelectedRowId((prev) => (prev === key ? undefined : key));
      onRowClick?.(row);
    },
    [getKey, onRowClick, rowEditing, release]
  );

  return {
    view,
    showCards,
    activeView,
    effectiveContainer,
    inlineEditing,
    rowEditing,
    selectedRowId,
    handleViewChange,
    handleRowClick,
  };
}
