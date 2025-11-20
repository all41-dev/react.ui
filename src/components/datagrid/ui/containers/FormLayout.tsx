import { useMemo } from "react";
import type { WithMeta } from "../../types/column";
import { renderEditor } from "../editors/EditorRegistry";
import type { Control } from "react-hook-form";

type FormLayoutProps<TForm extends object> = {
  fields: WithMeta<any, TForm>[];
  control: Control<TForm, any>;
  columns?: 1 | 2 | 3 | 4;
  gap?: string;
  className?: string;
};

export function FormLayout<TForm extends object>({
  fields,
  control,
  columns = 2,
  gap = "gap-4",
  className = "",
}: FormLayoutProps<TForm>) {
  // Sort fields by order if specified
  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => {
      const orderA = a.meta?.formLayout?.order ?? 999;
      const orderB = b.meta?.formLayout?.order ?? 999;
      return orderA - orderB;
    });
  }, [fields]);

  // Group fields by their layout requirements
  const { regularFields, fullWidthFields } = useMemo(() => {
    const regular: typeof sortedFields = [];
    const full: typeof sortedFields = [];

    sortedFields.forEach((field) => {
      if (field.meta?.formLayout?.colSpan === "full") {
        full.push(field);
      } else {
        regular.push(field);
      }
    });

    return { regularFields: regular, fullWidthFields: full };
  }, [sortedFields]);

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
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
    }[columns] || "grid-cols-2";

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Regular fields in grid */}
      {regularFields.length > 0 && (
        <div className={`grid ${gridColsClass} ${gap}`}>
          {regularFields.map((c) => {
            const colSpan = c.meta?.formLayout?.colSpan;
            const fieldClassName = c.meta?.formLayout?.className || "";
            const colSpanClass = getColSpanClass(colSpan);

            return (
              <div
                key={(c as any).accessorKey || c.id}
                className={`${colSpanClass} ${fieldClassName}`}
              >
                {renderEditor<TForm>({ column: c as any, control })}
              </div>
            );
          })}
        </div>
      )}

      {/* Full-width fields */}
      {fullWidthFields.length > 0 && (
        <div className={`space-y-4 ${gap.replace("gap-", "space-y-")}`}>
          {fullWidthFields.map((c: WithMeta<any, TForm>) => {
            const fieldClassName = c.meta?.formLayout?.className || "";
            return (
              <div
                key={(c as any).accessorKey || c.id}
                className={fieldClassName}
              >
                {renderEditor<TForm>({ column: c as any, control })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
