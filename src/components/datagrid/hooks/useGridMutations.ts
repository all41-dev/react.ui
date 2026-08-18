import { useCallback } from "react";
import { toast } from "sonner";
import type { ZodType } from "zod";

import { getApiMessage } from "../../../api/errors";
import type { DataGridProps } from "../types/grid";
import type { WithMeta } from "../types/column";
import { useCellEditMutations } from "./useCellEditMutations";
import type { useConfirm } from "./useConfirm";
import type { useEditSession } from "./useEditSession";

type Params<TRow extends object, TForm extends object> = {
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  onPersist: DataGridProps<TRow, TForm>["onPersist"];
  onDelete: ((row: TRow) => Promise<void> | void) | undefined;
  edit: ReturnType<typeof useEditSession<TRow>>;
  replaceRow: (prevRow: TRow, saved: TRow) => void;
  addRow: (created: TRow) => void;
  removeRow: (row: TRow) => void;
  deselect: (key: string) => void;
  /** The grid's row identity — the same function the table gets as `getRowId`. */
  getKey: (row: TRow) => string;
  confirm: ReturnType<typeof useConfirm>["confirm"];
};

/**
 * Everything that writes: the form submit, the delete, and — via
 * `useCellEditMutations` — the single-cell commit.
 */
export function useGridMutations<TRow extends object, TForm extends object>({
  columns,
  zodSchema,
  onPersist,
  onDelete,
  edit,
  replaceRow,
  addRow,
  removeRow,
  deselect,
  getKey,
  confirm,
}: Params<TRow, TForm>) {
  // See `useCellEditMutations` — `edit` is a fresh literal every render, its members are
  // not, so depend on the members.
  const { editingRow, close } = edit;

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
      // Errors deliberately propagate: the action button owns the catch, the toast and
      // its own spinner state.
      removeRow(row);
      deselect(getKey(row));
    },
    [onDelete, confirm, removeRow, deselect, getKey]
  );

  const handleSubmit = useCallback(
    async (values: TForm) => {
      if (!onPersist) return;
      try {
        // Reflect the result locally. A consumer using the query adapter will re-supply
        // `initialData` and overwrite this with server truth; a plain `onPersist`
        // consumer would otherwise see nothing happen at all.
        if (editingRow) {
          const saved = await onPersist("edit", values, editingRow);
          if (saved) replaceRow(editingRow, saved);
        } else {
          const created = await onPersist("create", values);
          if (created) addRow(created);
        }
        close();
      } catch (e) {
        toast.error(getApiMessage(e, "Save failed"));
        throw e;
      }
    },
    [onPersist, editingRow, close, replaceRow, addRow]
  );

  const { cellEditColumn, handleCellSave, startCellEditFromCell } =
    useCellEditMutations<TRow, TForm>({
      columns,
      zodSchema,
      onPersist,
      edit,
      replaceRow,
    });

  return {
    handleDelete,
    handleSubmit,
    cellEditColumn,
    handleCellSave,
    startCellEditFromCell,
  };
}
