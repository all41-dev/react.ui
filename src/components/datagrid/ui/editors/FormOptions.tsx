import { useWatch, type Control, type FieldValues } from "react-hook-form";
import type { ReactNode } from "react";

import type { Option } from "../../types/column";

/**
 * A select's `meta.options` function, evaluated against the live form.
 *
 * Mounted only for a select that declares a function: it subscribes to every value in
 * the form, so a static list must not pay for it.
 */
export function FormOptions<TForm extends FieldValues>({
  control,
  options,
  children,
}: {
  control: Control<TForm>;
  options: (formValues: TForm) => Option[];
  children: (options: Option[]) => ReactNode;
}) {
  const formValues = useWatch({ control }) as TForm;
  return children(options(formValues));
}
