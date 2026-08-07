import type { DefaultValues } from "react-hook-form";
import type { WithMeta } from "../types/column";

export function getAccessorKey<TRow extends object, TForm extends object = TRow>(
  c: WithMeta<TRow, TForm>
): string | undefined {
  // `accessorKey` only exists on one member of TanStack's ColumnDef union.
  return (c as { accessorKey?: string }).accessorKey;
}

export function computeDefaults<TRow extends object, TForm extends object = TRow>(
  row?: TRow,
  columns?: WithMeta<TRow, TForm>[]
): DefaultValues<TForm> {
  const d: Record<string, unknown> = row ? { ...row } : {};
  if (columns) {
    for (const c of columns) {
      const key = getAccessorKey(c);
      if (!key) continue;
      const raw = (row as Record<string, unknown> | undefined)?.[key];
      /*
       * `toForm`, never `format`. `format` is the display hook — seeding the editor with
       * it would put "1 234 €" into the field and submit that back.
       */
      if (c.meta?.toForm) {
        d[key] = c.meta.toForm(raw, row ?? ({} as TRow));
      } else if (raw !== undefined) {
        d[key] = raw;
      } else if (!row && c.meta?.editor) {
        // Creating: the editor's own default, else false for switches, else "".
        d[key] = c.meta.default ?? (c.meta.editor === "switch" ? false : "");
      }
    }
  }
  return d as DefaultValues<TForm>;
}
