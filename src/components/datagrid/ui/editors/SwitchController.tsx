import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import type { ReactNode } from "react";

import { SwitchField } from "./SwitchField";

/**
 * The switch editor's form binding.
 *
 * Separate from the registry's main path because `SwitchField` renders its own label,
 * hint and error in a horizontal layout — it never goes through `FieldChrome` or one of
 * the plain input controls.
 */
export function SwitchController<TForm extends FieldValues>({
  control,
  name,
  id,
  label,
  description,
  inputProps,
}: {
  control: Control<TForm>;
  name: Path<TForm>;
  id: string;
  label?: ReactNode;
  description?: string;
  inputProps?: Record<string, unknown>;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <SwitchField
          id={id}
          label={label}
          description={description}
          checked={Boolean(field.value)}
          onChange={field.onChange}
          hasError={!!fieldState.error}
          errorMsg={fieldState.error?.message}
          inputProps={inputProps}
        />
      )}
    />
  );
}
