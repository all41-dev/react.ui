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
  tree: { openAll: () => void; closeAll: () => void; locked: boolean }
) {
  const { openAll, closeAll, locked } = tree;
  useImperativeHandle(
    ref,
    () => ({
      startCreate: edit.startCreate,
      startEdit: edit.startEdit,
      cancelEdit: edit.close,
      isEditing: () => edit.session.kind !== "idle",
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
      edit.startCreate,
      edit.startEdit,
      edit.close,
      edit.session.kind,
      clearSelection,
      openAll,
      closeAll,
      locked,
    ]
  );
}
