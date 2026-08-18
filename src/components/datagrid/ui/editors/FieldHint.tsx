import { useWatch, type Control, type FieldValues } from "react-hook-form";
import type { ReactNode } from "react";

/**
 * A field's `meta.hint`, evaluated against the live form.
 *
 * Rendered only for the fields that declare one: it subscribes to every value in the
 * form, so mounting it unconditionally would re-render each field on every keystroke
 * anywhere.
 */
export function FieldHint<TForm extends FieldValues>({
  id,
  control,
  value,
  hint,
}: {
  /** `aria-describedby` target on the control — `${fieldId}-hint`. */
  id: string;
  control: Control<TForm>;
  /** The field's own value, already unwrapped by the `Controller`. */
  value: unknown;
  hint: (value: unknown, formValues: TForm) => ReactNode;
}) {
  const formValues = useWatch({ control }) as TForm;
  const text = hint(value, formValues);

  // A hint that has nothing to say renders no element, so the field keeps its height.
  if (text === null || text === undefined || text === false || text === "") return null;

  return (
    <p id={id} className="mt-1 text-[.6875rem] leading-[1.4] text-faint">
      {text}
    </p>
  );
}
