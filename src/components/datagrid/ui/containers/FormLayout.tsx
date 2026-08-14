import { useMemo } from "react";
import type { WithMeta } from "../../types/column";
import { renderEditor } from "../editors/EditorRegistry";
import { getAccessorKey } from "../../utils/getAccessorKey";
import type { Control } from "react-hook-form";

type FormLayoutProps<TRow extends object, TForm extends object> = {
  fields: WithMeta<TRow, TForm>[];
  control: Control<TForm>;
  /** Per-form prefix for every field's DOM id — see `renderEditor`. */
  idPrefix: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: string;
  className?: string;
  /** Accessor keys the user has actually changed, marked while the form is open. */
  dirtyKeys?: ReadonlySet<string>;
};

/**
 * Wraps one field so a modified one can announce itself. Without this a long form gives
 * no answer to "what did I just change?" — and when the changed column is hidden from the
 * table, saving otherwise looks like it did nothing at all.
 */
export function Field({
  changed,
  className = "",
  children,
}: {
  changed: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rui-field relative ${className}`}
      data-changed={changed ? "true" : undefined}
    >
      {changed && (
        <span className="pointer-events-none absolute right-0 top-0 flex items-center gap-1 text-[.625rem] font-medium uppercase tracking-[.04em] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          changed
        </span>
      )}
      {children}
    </div>
  );
}

export function FormLayout<TRow extends object, TForm extends object>({
  fields,
  control,
  idPrefix,
  columns = 2,
  gap = "gap-4",
  className = "",
  dirtyKeys,
}: FormLayoutProps<TRow, TForm>) {
  // `fields` arrives already sorted by `meta.formLayout.order` — see `useEditForm`.
  // Sorting again here was a second copy of the same rule, free to drift out of sync.
  const { regularFields, fullWidthFields } = useMemo(() => {
    const regular: typeof fields = [];
    const full: typeof fields = [];

    fields.forEach((field) => {
      const colSpan = field.meta?.formLayout?.colSpan;
      // Rich editors span the full width by default; an explicit colSpan overrides.
      const isRich =
        field.meta?.editor === "markdown" || field.meta?.editor === "code";
      if (colSpan === "full" || (isRich && colSpan == null)) {
        full.push(field);
      } else {
        regular.push(field);
      }
    });

    return { regularFields: regular, fullWidthFields: full };
  }, [fields]);

  const getColSpanClass = (colSpan?: 1 | 2 | 3 | 4 | "full") => {
    if (colSpan === "full") return "col-span-full";
    if (!colSpan) return "";

    const colMap: Record<1 | 2 | 3 | 4, string> = {
      1: "col-span-1",
      2: "col-span-2",
      3: "col-span-3",
      4: "col-span-4",
    };

    return colMap[colSpan] || "";
  };

  const gridColsClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-4",
    }[columns] || "grid-cols-1 md:grid-cols-2";

  return (
    <div className={`space-y-4 ${className}`}>
      {regularFields.length > 0 && (
        <div className={`grid ${gridColsClass} ${gap}`}>
          {regularFields.map((c) => {
            const colSpan = c.meta?.formLayout?.colSpan;
            const fieldClassName = c.meta?.formLayout?.className || "";
            const colSpanClass = getColSpanClass(colSpan);
            const key = getAccessorKey(c);

            return (
              <Field
                key={key || c.id}
                changed={!!key && !!dirtyKeys?.has(key)}
                className={`${colSpanClass} ${fieldClassName}`}
              >
                {renderEditor({ column: c, control, idPrefix })}
              </Field>
            );
          })}
        </div>
      )}

      {fullWidthFields.length > 0 && (
        <div className={`space-y-4 ${gap.replace("gap-", "space-y-")}`}>
          {fullWidthFields.map((c) => {
            const fieldClassName = c.meta?.formLayout?.className || "";
            const key = getAccessorKey(c);
            return (
              <Field
                key={key || c.id}
                changed={!!key && !!dirtyKeys?.has(key)}
                className={fieldClassName}
              >
                {renderEditor({ column: c, control, idPrefix })}
              </Field>
            );
          })}
        </div>
      )}
    </div>
  );
}
