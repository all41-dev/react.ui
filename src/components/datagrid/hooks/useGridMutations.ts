import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { ZodType } from "zod";

import { getApiMessage } from "../../../api/errors";
import type { DataGridProps } from "../types/grid";
import type { WithMeta } from "../types/column";
import { computeDefaults } from "../utils/getAccessorKey";
import { getColId } from "./useGridColumns";
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
  deselect: (id: string | number | undefined) => void;
  getId: (row: TRow) => string | number | undefined;
  confirm: ReturnType<typeof useConfirm>["confirm"];
};

/**
 * Everything that writes: the form submit, the delete, and the single-cell commit.
 *
 * Split out of DataGrid.tsx because the cell commit below is the densest logic in the
 * grid — a full `toForm` / `fromForm` round-trip plus field-scoped zod validation — and
 * inside the component the only way to reach it was a complete render.
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
  getId,
  confirm,
}: Params<TRow, TForm>) {
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
      deselect(getId(row));
    },
    [onDelete, confirm, removeRow, deselect, getId]
  );

  const handleSubmit = useCallback(
    async (values: TForm) => {
      if (!onPersist) return;
      try {
        // Reflect the result locally. A consumer using the query adapter will re-supply
        // `initialData` and overwrite this with server truth; a plain `onPersist`
        // consumer would otherwise see nothing happen at all.
        const editingRow = edit.editingRow;
        if (editingRow) {
          const saved = await onPersist("edit", values, editingRow);
          if (saved) replaceRow(editingRow, saved);
        } else {
          const created = await onPersist("create", values);
          if (created) addRow(created);
        }
        edit.close();
      } catch (e) {
        toast.error(getApiMessage(e, "Save failed"));
        throw e;
      }
    },
    [onPersist, edit, replaceRow, addRow]
  );

  const cellEditColumn = useMemo(
    () =>
      edit.cell
        ? columns.find((c) => getColId(c) === edit.cell!.columnId)
        : undefined,
    [edit.cell, columns]
  );

  const handleCellSave = useCallback(
    async (value: unknown) => {
      const cell = edit.cell;
      if (!onPersist || !cell || !cellEditColumn) return;
      const key = cell.columnId;
      const prevRow = cell.row;

      /*
       * Exactly the full form's round-trip, on one field: put the row through `toForm`
       * to get form-shaped values, swap in what the popover produced, then run every
       * column's `fromForm` back the other way.
       *
       * Doing this needed the §3.6 split. While `parse` was the only hook, running it
       * over the other fields would have double-converted them — they held stored row
       * values, not form values — so the cell path could only ever convert the one field
       * and sent the rest in whatever shape they happened to be in.
       */
      const formDraft: Record<string, unknown> = {
        ...(computeDefaults(prevRow as never, columns as never) as object),
        [key]: value,
      };
      const draft: Record<string, unknown> = { ...formDraft };
      for (const c of columns) {
        const colKey = (c as { accessorKey?: string }).accessorKey;
        if (!colKey || !c.meta?.fromForm) continue;
        draft[colKey] = c.meta.fromForm(formDraft[colKey], formDraft as TForm);
      }

      // Validate just this field: a full-schema failure on some OTHER field must not
      // block editing this one.
      const result = (
        zodSchema as unknown as {
          safeParse?: (v: unknown) => {
            success: boolean;
            data?: unknown;
            error: { issues: { path: (string | number)[]; message: string }[] };
          };
        }
      ).safeParse?.(draft);
      if (result && !result.success) {
        const own = result.error.issues.find((i) => String(i.path[0]) === key);
        if (own) throw new Error(own.message);
      }

      /*
       * Prefer zod's OUTPUT to the raw draft. Only `success` used to be read, so a schema
       * doing `z.string().transform(Number)` persisted the untransformed string — and
       * because an object schema strips unknown keys, the parsed value is genuinely
       * `TForm`-shaped rather than the row-shaped payload the cast used to claim.
       * The draft is the fallback when the schema rejected some unrelated field.
       */
      const payload = (result?.success ? result.data : draft) as TForm;

      const saved = await onPersist("cell", payload, prevRow);
      if (saved) replaceRow(prevRow, saved);
      edit.close();
    },
    [onPersist, edit, cellEditColumn, columns, zodSchema, replaceRow]
  );

  const startCellEditFromCell = useCallback(
    (row: unknown, columnId: string, cellEl: HTMLElement) => {
      if (!onPersist) return;
      const r = cellEl.getBoundingClientRect();
      edit.startCellEdit(row as TRow, columnId, {
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        width: r.width,
      });
    },
    [onPersist, edit]
  );

  return {
    handleDelete,
    handleSubmit,
    cellEditColumn,
    handleCellSave,
    startCellEditFromCell,
  };
}
