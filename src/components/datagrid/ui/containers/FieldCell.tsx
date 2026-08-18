import type { Control } from "react-hook-form";
import type { WithMeta } from "../../types/column";
import type { FormGroupVariant } from "../../types/formLayout";
import { getAccessorKey } from "../../utils/getAccessorKey";
import { renderEditor } from "../editors/EditorRegistry";
import { colSpanClass } from "./formGrid";

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

type CellProps<TRow extends object, TForm extends object> = {
  field: WithMeta<TRow, TForm>;
  control: Control<TForm>;
  idPrefix: string;
  dirtyKeys?: ReadonlySet<string>;
  /** Variant of the section the field sits in. Loose fields take the form's own grid. */
  variant?: FormGroupVariant;
};

export function FieldCell<TRow extends object, TForm extends object>({
  field,
  control,
  idPrefix,
  dirtyKeys,
  variant = "grid",
}: CellProps<TRow, TForm>) {
  const key = getAccessorKey(field);
  const layout = field.meta?.formLayout;
  // Cards flow at their own width, so the span classes have nothing to act on.
  const spanned = variant !== "cards";
  // Rich editors span the full width by default; an explicit colSpan overrides.
  const isRich = field.meta?.editor === "markdown" || field.meta?.editor === "code";
  const span = layout?.colSpan ?? (isRich ? "full" : 1);

  return (
    <Field
      changed={!!key && !!dirtyKeys?.has(key)}
      className={`${spanned ? colSpanClass(span) : ""} ${layout?.className || ""}`}
    >
      {renderEditor({ column: field, control, idPrefix, variant })}
    </Field>
  );
}
