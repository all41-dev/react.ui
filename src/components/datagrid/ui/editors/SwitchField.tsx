import type { InputHTMLAttributes, ReactNode } from "react";

import { FieldDescriptionIcon } from "./FieldDescriptionIcon";

/**
 * The switch editor's whole markup — unlike the plain editors it carries its own label,
 * description icon and error in a horizontal layout, so it never goes through the
 * registry's `FieldChrome`/`Field` path.
 */
export function SwitchField({
  id,
  label,
  description,
  checked,
  onChange,
  hasError,
  errorMsg,
  inputProps,
}: {
  /** The checkbox's DOM id; the hint and error ids are derived from it. */
  id: string;
  label?: ReactNode;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hasError: boolean;
  errorMsg?: string;
  /** Consumer `editorProps`, minus `className` — an override would break `sr-only peer`. */
  inputProps?: Record<string, unknown>;
}) {
  const describedBy =
    [hasError ? `${id}-error` : null, description ? `${id}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col">
      {/* The icon sits outside the `<label>`: inside it, a click would toggle the
          switch and the description would join the checkbox's accessible name. */}
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={id}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* A 38×21 track with a 15px knob. Smaller than a default toggle,
              which looks oversized next to 32px fields. */}
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              id={id}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              className="sr-only peer"
              {...(inputProps as unknown as InputHTMLAttributes<HTMLInputElement>)}
              /* After the spread, like the plain editors do: consumer `editorProps` may
                 add attributes, but it must not take over the controlled binding. */
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <div className="h-[21px] w-[38px] rounded-full border border-border-translucent bg-surface-raised transition-[background-color,border-color] duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--rui-focus-ring)] peer-checked:border-accent peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:h-[15px] after:w-[15px] after:rounded-full after:bg-muted after:transition-[transform,background-color] after:duration-200 after:content-[''] peer-checked:after:translate-x-[17px] peer-checked:after:bg-accent-contrast"></div>
          </div>
          {label && (
            <span className="min-w-0 text-[.8125rem] font-medium text-body">
              {label}
            </span>
          )}
        </label>
        {description && (
          <FieldDescriptionIcon
            descriptionId={`${id}-hint`}
            description={description}
          />
        )}
      </div>
      {hasError && (
        <p
          id={`${id}-error`}
          role="alert"
          className="ml-[50px] mt-1 text-[.6875rem] font-semibold text-danger"
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
}
