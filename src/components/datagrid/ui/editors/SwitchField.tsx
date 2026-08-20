import type { ReactNode } from "react";

import type { FormGroupVariant } from "../../types/formLayout";
import { buildDescribedBy } from "./editorChrome";
import { FieldChrome } from "./FieldChrome";
import { SwitchChip } from "./SwitchChip";
import { SwitchTrack } from "./SwitchTrack";

type SwitchProps = {
  /** The checkbox's DOM id; the description, hint and error ids are derived from it. */
  id: string;
  label?: ReactNode;
  required?: boolean;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hasError: boolean;
  errorMsg?: string;
  /** The field's `meta.hint` output. An error takes its place. */
  hint?: ReactNode;
  /** Consumer `editorProps`, minus `className` — an override would break `sr-only peer`. */
  inputProps?: Record<string, unknown>;
  /**
   * How the field's section arranges its fields. `"cards"` gets the horizontal chip form;
   * anything else gets the same micro-label-over-control stack as the plain editors, so a
   * switch lines up with its neighbours on a form row.
   */
  variant?: FormGroupVariant;
};

/**
 * The switch editor.
 *
 * Two layouts, picked from the section the field sits in rather than from a consumer
 * option: a chip carrying its own label beside the track in a `"cards"` section, and the
 * plain editors' `FieldChrome` stack everywhere else. The stacked form is what keeps a
 * switch aligned with the inputs either side of it on a form row.
 */
export function SwitchField({
  id,
  label,
  required,
  description,
  checked,
  onChange,
  hasError,
  errorMsg,
  hint,
  inputProps,
  variant = "grid",
}: SwitchProps) {
  const describedBy = buildDescribedBy({
    id,
    description,
    hasError,
    hasHint: !!hint && !hasError,
  });

  const track = (
    <SwitchTrack
      id={id}
      checked={checked}
      onChange={onChange}
      hasError={hasError}
      required={required}
      describedBy={describedBy}
      inputProps={inputProps}
      variant={variant}
    />
  );

  if (variant === "cards") {
    return (
      <SwitchChip
        id={id}
        label={label}
        required={required}
        description={description}
        hasError={hasError}
        errorMsg={errorMsg}
        hint={hint}
        track={track}
      />
    );
  }

  return (
    <FieldChrome
      id={id}
      label={label}
      required={required}
      description={description}
      hasError={hasError}
      errorMsg={errorMsg}
      hint={hint}
    >
      {/* The control line is 32px tall for every plain editor; the track centres in it
          so labels and controls align across the row. */}
      <div className="flex h-8 items-center">{track}</div>
    </FieldChrome>
  );
}
