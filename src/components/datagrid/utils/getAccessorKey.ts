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
      if (c.meta?.format) {
        d[key] = c.meta.format(raw, row ?? ({} as T));
      } else if (raw !== undefined) {
        d[key] = raw;
      }
    }
  }
  return d as DefaultValues<T>;
}
