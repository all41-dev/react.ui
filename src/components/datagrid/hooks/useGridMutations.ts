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
  removeRows: (keys: ReadonlySet<string>) => void;
  /** Keys nested under a row. Empty outside tree mode. */
  descendantKeysOf: (key: string) => string[];
  /** Opens the ancestors of a row just written. No-op outside tree mode. */
  reveal: (row: TRow) => void;
  deselect: (key: string) => void;
  /** The grid's row identity — the same function the table gets as `getRowId`. */
  getKey: (row: TRow) => string;
  confirm: ReturnType<typeof useConfirm>["confirm"];
  /** Called with the row a save closed on, once the session is shut; absent outside row mode. */
  onSaved?: (row: TRow) => void;
};

/** `next`: after a create, open another draft with the same seed instead of closing. */
export type SubmitOptions = { next?: boolean };

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
  removeRows,
  descendantKeysOf,
  reveal,
  deselect,
  getKey,
  confirm,
  onSaved,
}: Params<TRow, TForm>) {
  // See `useCellEditMutations` — `edit` is a fresh literal every render, its members are
  // not, so depend on the members.
  const { editingRow, createSeed, close, startCreate } = edit;

  const handleDelete = useCallback(
    async (row: TRow) => {
      if (!onDelete) return;
      const key = getKey(row);
      const nested = descendantKeysOf(key);
      const ok = await confirm({
        title:
          nested.length === 0
            ? "Delete this item?"
            : `Delete this item and its ${nested.length} nested ${
                nested.length === 1 ? "row" : "rows"
              }?`,
        description: "This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        isDestructive: true,
      });
      if (!ok) return;
      await onDelete(row);
      // Errors deliberately propagate: the action button owns the catch, the toast and
      // its own spinner state.
      // `onDelete` runs once, for the row; its subtree leaves the grid with it.
      const removed = [key, ...nested];
      removeRows(new Set(removed));
      for (const k of removed) deselect(k);
    },
    [onDelete, confirm, removeRows, descendantKeysOf, deselect, getKey]
  );

  const replaceAndReveal = useCallback(
    (prevRow: TRow, saved: TRow) => {
      replaceRow(prevRow, saved);
      reveal(saved);
    },
    [replaceRow, reveal]
  );

  const handleSubmit = useCallback(
    async (values: TForm, opts?: SubmitOptions) => {
      if (!onPersist) return;
      try {
        // Reflect the result locally. A consumer using the query adapter will re-supply
        // `initialData` and overwrite this with server truth; a plain `onPersist`
        // consumer would otherwise see nothing happen at all.
        if (editingRow) {
          const saved = await onPersist("edit", values, editingRow);
          if (saved) replaceAndReveal(editingRow, saved);
          close();
          onSaved?.(saved ?? editingRow);
          return;
        }
        const created = await onPersist("create", values);
        if (created) {
          addRow(created);
          reveal(created);
        }
        /* The form that just saved is dirty, so the chained draft goes through `close`
           first; the seed object is reused so the draft stays under the same parent. */
        close();
        if (opts?.next === true) startCreate(createSeed);
        else if (created) onSaved?.(created);
      } catch (e) {
        toast.error(getApiMessage(e, "Save failed"));
        throw e;
      }
    },
    [
      onPersist,
      editingRow,
      createSeed,
      close,
      startCreate,
      replaceAndReveal,
      addRow,
      reveal,
      onSaved,
    ]
  );

  const { cellEditColumn, handleCellSave, saveCell, startCellEditFromCell } =
    useCellEditMutations<TRow, TForm>({
      columns,
      zodSchema,
      onPersist,
      edit,
      replaceRow: replaceAndReveal,
    });

  return {
    handleDelete,
    handleSubmit,
    cellEditColumn,
    handleCellSave,
    saveCell,
    startCellEditFromCell,
  };
}
