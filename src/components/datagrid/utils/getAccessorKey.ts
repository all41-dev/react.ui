import type { DefaultValues } from "react-hook-form";
import type { WithMeta } from "../types/column";
import { getPath, setPath } from "./objectPath";

export function getAccessorKey<TRow extends object, TForm extends object = TRow>(
  c: WithMeta<TRow, TForm>
): string | undefined {
  // `accessorKey` only exists on one member of TanStack's ColumnDef union.
  return (c as { accessorKey?: string }).accessorKey;
}

/**
 * Seeds the edit form from a row.
 *
 * Only the declared columns are read. Copying the whole row instead would make every
 * field it carries — audit stamps, server-side timestamps, nested relations — a form
 * value that comes back out of `handleSubmit` and gets posted.
 */
export function computeDefaults<TRow extends object, TForm extends object = TRow>(
  row?: TRow,
  columns?: WithMeta<TRow, TForm>[]
): DefaultValues<TForm> {
  const d: Record<string, unknown> = {};
  for (const c of columns ?? []) {
    const key = getAccessorKey(c);
    if (!key) continue;
    const raw = getPath(row, key);
    /*
     * `toForm`, never `format`. `format` is the display hook — seeding the editor with
     * it would put "1 234 €" into the field and submit that back.
     */
    if (c.meta?.toForm) {
      setPath(d, key, c.meta.toForm(raw, row ?? ({} as TRow)));
    } else if (raw !== undefined) {
      setPath(d, key, raw);
    } else if (!row && c.meta?.editor) {
      // Creating: the editor's own default, else false for switches, else "".
      setPath(d, key, c.meta.default ?? (c.meta.editor === "switch" ? false : ""));
    }
  }
  return d as DefaultValues<TForm>;
}

/**
 * Form values → stored shape.
 *
 * Applied to every column carrying an accessor key, editor or not: `fromForm` describes
 * how a value is stored, not how it is edited, so a form submit and a single-cell save
 * must convert through the same set.
 */
export function applyFromForm<TRow extends object, TForm extends object>(
  values: TForm,
  columns: WithMeta<TRow, TForm>[]
): TForm {
  const out = { ...values } as Record<string, unknown>;
  for (const c of columns) {
    const key = getAccessorKey(c);
    if (!key || !c.meta?.fromForm) continue;
    setPath(out, key, c.meta.fromForm(getPath(values, key), values));
  }
  return out as TForm;
}
