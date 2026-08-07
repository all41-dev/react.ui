import { useCallback, useMemo } from "react";
import type { ZodType } from "zod";

import type { DataGridProps } from "../types/grid";
import type { WithMeta } from "../types/column";
import { computeDefaults, getAccessorKey } from "../utils/getAccessorKey";
import { getColId } from "./useGridColumns";
import type { useEditSession } from "./useEditSession";

type Params<TRow extends object, TForm extends object> = {
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  onPersist: DataGridProps<TRow, TForm>["onPersist"];
  edit: ReturnType<typeof useEditSession<TRow>>;
  replaceRow: (prevRow: TRow, saved: TRow) => void;
};

/** The single-cell commit: open the popover, round-trip one field, persist. */
export function useCellEditMutations<TRow extends object, TForm extends object>({
  columns,
  zodSchema,
  onPersist,
  edit,
  replaceRow,
}: Params<TRow, TForm>) {
  /*
   * Destructured on purpose. `useEditSession` hands back a fresh object literal every
   * render even though every member on it is stable, so depending on `edit` itself makes
   * these callbacks new every render — which cascades into a new `DataGridContext` value
   * and re-renders every cell in the body on every keystroke.
   */
  const { cell, startCellEdit, close } = edit;

  const cellEditColumn = useMemo(
    () => (cell ? columns.find((c) => getColId(c) === cell.columnId) : undefined),
    [cell, columns]
  );

  const handleCellSave = useCallback(
    async (value: unknown) => {
      if (!onPersist || !cell || !cellEditColumn) return;
      const key = cell.columnId;
      const prevRow = cell.row;

      /*
       * The full form's round-trip, on one field: run the row through `toForm` to get
       * form-shaped values, swap in what the popover produced, then run every column's
       * `fromForm` back the other way. `toForm` and `fromForm` have to be separate hooks
       * for this — with one shared hook the other fields would get converted twice.
       */
      const formDraft: Record<string, unknown> = {
        ...computeDefaults(prevRow, columns),
        [key]: value,
      };
      const draft: Record<string, unknown> = { ...formDraft };
      for (const c of columns) {
        const colKey = getAccessorKey(c);
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
       * Use zod's output, not the raw draft, so a schema like `z.string().transform(Number)`
       * persists the transformed value. Falls back to the draft when the schema rejected
       * some unrelated field.
       */
      const payload = (result?.success ? result.data : draft) as TForm;

      const saved = await onPersist("cell", payload, prevRow);
      if (saved) replaceRow(prevRow, saved);
      close();
    },
    [onPersist, cell, close, cellEditColumn, columns, zodSchema, replaceRow]
  );

  const startCellEditFromCell = useCallback(
    (row: unknown, columnId: string, cellEl: HTMLElement) => {
      if (!onPersist) return;
      const r = cellEl.getBoundingClientRect();
      startCellEdit(row as TRow, columnId, {
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        width: r.width,
      });
    },
    [onPersist, startCellEdit]
  );

  return { cellEditColumn, handleCellSave, startCellEditFromCell };
}
