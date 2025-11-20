import type { FieldValues, Path } from "react-hook-form";
import type { WithMeta } from "./types/column";
import type { Option } from "./types/column";
import { useMemo } from "react";

function getByPath(obj: unknown, path?: string) {
  if (!obj || !path) return undefined;
  return path
    .split(".")
    .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), obj as any);
}

function toLabel(value: unknown, options?: Option[]) {
  if (!options?.length) return value;
  const v = value == null ? "" : String(value);
  return options.find((o) => o.value === v)?.label ?? value;
}


export function FormRenderer<T extends FieldValues>({
  columns,
  row,
  title,
  layout = "grid",
  cols = 2,
  filter = "form",
}: {
  columns: WithMeta<T>[];
  row: T;
  title?: string;
  layout?: "grid" | "stack";
  cols?: 1 | 2 | 3 | 4;
  filter?: "form" | "all";
}) {
  const fields = useMemo(() => {
    if (filter === "all") return columns;
    return columns.filter(
      (c) => c.meta?.visibleInForm !== false && !!c.meta?.editor
    );
  }, [columns, filter]);

  return (
    <div className="flex h-full flex-col">
      {title && (
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div
          className={
            layout === "grid"
              ? `grid gap-4 ${
                  cols === 1
                    ? "grid-cols-1"
                    : cols === 2
                    ? "md:grid-cols-2"
                    : cols === 3
                    ? "md:grid-cols-3"
                    : "md:grid-cols-4"
                }`
              : "space-y-4"
          }
        >
          {fields.map((c) => {
            const key = (c as any).accessorKey as Path<T> | undefined;
            const label = c.meta?.label ?? String(c.header ?? key ?? "");
            const raw = getByPath(row, key as string | undefined);

            const formatted = c.meta?.format
              ? (c.meta.format as (v: unknown) => unknown)(raw)
              : c.meta?.editor === "select"
              ? toLabel(raw, c.meta?.options)
              : raw;

            const value =
              formatted == null
                ? "—"
                : typeof formatted === "object"
                ? JSON.stringify(formatted)
                : String(formatted);

            return (
              <div
                key={String(key ?? c.id ?? label)}
                className="rounded-lg border p-3"
              >
                <div className="mb-1 text-xs font-medium text-gray-500">
                  {label}
                </div>
                <div className="text-sm">{value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
