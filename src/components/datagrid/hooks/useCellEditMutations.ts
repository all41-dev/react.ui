import { useCallback, useMemo } from "react";
import type { ZodType } from "zod";

import type { DataGridProps } from "../types/grid";
import type { WithMeta } from "../types/column";
import {
  applyFromForm,
  computeDefaults,
  getAccessorKey,
} from "../utils/getAccessorKey";
import { setPath } from "../utils/objectPath";
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
      /* The write key is the column's accessor key, not its id: those differ whenever a
         column declares both, and the popover's own form is keyed by the accessor key. */
      const key = getAccessorKey(cellEditColumn);
      if (!key) return;
      const prevRow = cell.row;

      /*
       * The full form's round-trip, on one field: run the row through `toForm` to get
       * form-shaped values, swap in what the popover produced, then run every column's
       * `fromForm` back the other way. `toForm` and `fromForm` have to be separate hooks
       * for this — with one shared hook the other fields would get converted twice.
       */
      const formDraft = computeDefaults(prevRow, columns) as TForm;
      setPath(formDraft as Record<string, unknown>, key, value);
      const draft = applyFromForm(formDraft, columns) as Record<string, unknown>;

      /*
       * Validate just this field: a full-schema failure on some OTHER field must not
       * block editing this one. The match is on the issue's FULL path — comparing only
       * its first segment lets every sibling under a shared root (`user.email` against
       * `user.name`) surface in a popover that does not contain that field.
       *
       * `startsWith` covers a column whose editor owns a whole object: an issue on one of
       * its members is that column's to report.
       */
      const result = zodSchema.safeParse(draft);
      if (!result.success) {
        const own = result.error.issues.find((i) => {
          const path = i.path.join(".");
          return path === key || path.startsWith(`${key}.`);
        });
        if (own) throw new Error(own.message);
      }

      /*
       * Use zod's output, not the raw draft, so a schema like `z.string().transform(Number)`
       * persists the transformed value. Falls back to the draft when the schema rejected
       * some unrelated field; the draft carries only the declared columns' keys, so that
       * branch still posts a field the grid knows about rather than the whole row.
       */
      const payload = (result.success ? result.data : draft) as TForm;

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
