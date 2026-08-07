import { useImperativeHandle, type Ref } from "react";
import type { DataGridHandle } from "../types/grid";
import type { useEditSession } from "./useEditSession";

/**
 * The grid's public imperative surface — how a parent drives the edit session it
 * doesn't own. See {@link DataGridHandle}.
 */
export function useGridHandle<TRow extends object>(
  ref: Ref<DataGridHandle<TRow>> | undefined,
  edit: ReturnType<typeof useEditSession<TRow>>,
  clearSelection: () => void
) {
  useImperativeHandle(
    ref,
    () => ({
      startCreate: edit.startCreate,
      startEdit: edit.startEdit,
      cancelEdit: edit.close,
      isEditing: () => edit.session.kind !== "idle",
      clearSelection,
    }),
    [edit.startCreate, edit.startEdit, edit.close, edit.session.kind, clearSelection]
  );
}
