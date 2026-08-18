import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import type { ReactNode } from "react";

import type { FormGroupVariant } from "../../types/formLayout";
import { FieldHint } from "./FieldHint";
import { SwitchField } from "./SwitchField";

/**
 * The switch editor's form binding.
 *
 * Separate from the registry's main path because `SwitchField` owns both of its layouts —
 * in a `"cards"` section it carries its own label and error, and everywhere else it wraps
 * itself in `FieldChrome`.
 */
export function SwitchController<TForm extends FieldValues>({
  control,
  name,
  id,
  label,
  required,
  description,
  hint,
  inputProps,
  variant,
}: {
  control: Control<TForm>;
  name: Path<TForm>;
  id: string;
  label?: ReactNode;
  required?: boolean;
  description?: string;
  hint?: (value: unknown, formValues: TForm) => ReactNode;
  inputProps?: Record<string, unknown>;
  variant?: FormGroupVariant;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <SwitchField
          id={id}
          label={label}
          required={required}
          description={description}
          checked={Boolean(field.value)}
          onChange={field.onChange}
          hasError={!!fieldState.error}
          errorMsg={fieldState.error?.message}
          hint={
            hint && (
              <FieldHint
                id={`${id}-hint`}
                control={control}
                value={field.value}
                hint={hint}
              />
            )
          }
          inputProps={inputProps}
          variant={variant}
        />
      )}
    />
  );
}
