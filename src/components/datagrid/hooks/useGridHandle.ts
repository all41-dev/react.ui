import { useImperativeHandle, type Ref } from "react";
import type { DataGridHandle } from "../types/grid";
import type { useEditSession } from "./useEditSession";

/**
 * The grid's public imperative surface — how a parent drives the edit session it
 * doesn't own. See {@link DataGridHandle}.
 */
export function useGridHandle<TRow extends object, TForm extends object>(
  ref: Ref<DataGridHandle<TRow, TForm>> | undefined,
  edit: ReturnType<typeof useEditSession<TRow>>,
  clearSelection: () => void,
  tree: { openAll: () => void; closeAll: () => void; locked: boolean },
  startCellEdit: (row: unknown, columnId: string, anchor: HTMLElement) => void
) {
  const { openAll, closeAll, locked } = tree;
  const { startCreate, startEdit, close, session } = edit;
  useImperativeHandle(
    ref,
    () => ({
      /* The session's own entries report a refusal; the handle keeps its `void` shape. */
      startCreate: (seed) => {
        startCreate(seed);
      },
      startEdit: (row) => {
        startEdit(row);
      },
      startCellEdit,
      cancelEdit: close,
      isEditing: () => session.kind !== "idle",
      clearSelection,
      /* Inert while a search or a filter holds every node open, like the chevrons: the
         change would not show until the criteria clear. */
      expandAll: () => {
        if (!locked) openAll();
      },
      collapseAll: () => {
        if (!locked) closeAll();
      },
    }),
    [
      startCreate,
      startEdit,
      close,
      session.kind,
      startCellEdit,
      clearSelection,
      openAll,
      closeAll,
      locked,
    ]
  );
}
