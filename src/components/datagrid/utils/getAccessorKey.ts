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
       * `toForm`, not `format`. This used to call `format` — the DISPLAY hook — so a
       * column formatting 1234 as "1 234 €" seeded the edit field with that string and
       * submitted it back. `format` now never touches the form.
       */
      if (c.meta?.toForm) {
        d[key] = c.meta.toForm(raw, row ?? ({} as T));
      } else if (raw !== undefined) {
        d[key] = raw;
      } else if (!row && c.meta?.editor) {
        // Creating: seed per spec — editor default, else false for switches, else "".
        d[key] = c.meta.default ?? (c.meta.editor === "switch" ? false : "");
      }
    }
  }
  return d as DefaultValues<T>;
}
