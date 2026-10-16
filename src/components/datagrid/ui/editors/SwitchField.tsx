import type { ReactNode } from "react";

import { useTooltipId } from "../tooltipContext";
import { CellFieldError } from "./CellFieldError";
import {
  buildDescribedBy,
  cellErrorTooltipProps,
  type EditorVariant,
} from "./editorChrome";
import { FieldChrome } from "./FieldChrome";
import { SwitchChip } from "./SwitchChip";
import { SwitchTrack } from "./SwitchTrack";

type SwitchProps = {
  /** The checkbox's DOM id; the description, hint and error ids are derived from it. */
  id: string;
  label?: string;
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
   * Where the field renders. `"cards"` gets the horizontal chip form, `"cell"` the bare
   * track for a table cell, and anything else the same micro-label-over-control stack as
   * the plain editors, so a switch lines up with its neighbours on a form row.
   */
  variant?: EditorVariant;
};

/**
 * The switch editor.
 *
 * Three layouts, picked from where the field renders rather than from a consumer
 * option: a chip carrying its own label beside the track in a `"cards"` section, the
 * track alone in a table cell (named through `aria-label`, its error a ring and a
 * tooltip), and the plain editors' `FieldChrome` stack everywhere else. The stacked form
 * is what keeps a switch aligned with the inputs either side of it on a form row.
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
  const tooltipId = useTooltipId();

  if (variant === "cell") {
    const errorId = `${id}-error`;
    const message = hasError ? errorMsg : undefined;
    return (
      <>
        <SwitchTrack
          id={id}
          checked={checked}
          onChange={onChange}
          hasError={hasError}
          required={required}
          describedBy={hasError ? errorId : undefined}
          ariaLabel={label}
          anchorProps={cellErrorTooltipProps(tooltipId, message)}
          inputProps={inputProps}
          variant={variant}
        />
        <CellFieldError id={errorId} message={message} />
      </>
    );
  }

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
