import type { DefaultValues, FieldValues } from "react-hook-form";
import type { WithMeta } from "../types/column";

export function getAccessorKey<T extends FieldValues>(c: WithMeta<T>) {
  return (c as any).accessorKey as string | undefined;
}

export function computeDefaults<T extends FieldValues>(
  row?: T,
  columns?: WithMeta<T>[]
): DefaultValues<T> {
  const d: any = row ? { ...row } : {};
  if (columns) {
    for (const c of columns) {
      const key = getAccessorKey<T>(c);
      if (!key) continue;
      const raw = (row as any)?.[key];
      /*
       * `toForm`, never `format`. `format` is the display hook — seeding the editor with
       * it would put "1 234 €" into the field and submit that back.
       */
      if (c.meta?.toForm) {
        d[key] = c.meta.toForm(raw, row ?? ({} as T));
      } else if (raw !== undefined) {
        d[key] = raw;
      } else if (!row && c.meta?.editor) {
        // Creating: the editor's own default, else false for switches, else "".
        d[key] = c.meta.default ?? (c.meta.editor === "switch" ? false : "");
      }
    }
  }
  return d as DefaultValues<T>;
}
