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
  getId: (row: TRow) => string | number | undefined;
  onRowClick?: (row: TRow) => void;
};

/** The list/cards toggle, the single-row click selection, and the container fallback. */
export function useGridView<TRow extends object>({
  hasCard,
  defaultView,
  editContainer,
  grouped,
  edit,
  getId,
  onRowClick,
}: Params<TRow>) {
  const [view, setView] = useState<"list" | "cards">(defaultView);
  const [selectedRowId, setSelectedRowId] = useState<
    string | number | undefined
  >(undefined);

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
   * "Inline" names a table-row placement that has no cards equivalent. Left as-is, an
   * inline session started from cards had nowhere to render: the click looked dead and
   * the live session re-opened the editor on the next switch to list. In cards the same
   * session opens as a modal instead.
   */
  const effectiveContainer: EditContainerKind =
    showCards && editContainer === "inline" ? "modal" : editContainer;
  const inlineEditing = effectiveContainer === "inline";

  const handleViewChange = useCallback(
    (v: "list" | "cards") => {
      // A session that straddles the toggle changes shell mid-flight (inline ↔ modal)
      // and loses its form state anyway when the host view unmounts — close it instead.
      edit.close();
      setView(v);
    },
    [edit.close]
  );

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

  return {
    view,
    showCards,
    activeView,
    effectiveContainer,
    inlineEditing,
    selectedRowId,
    handleViewChange,
    handleRowClick,
  };
}
