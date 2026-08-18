import type { ReactNode } from "react";

import { FieldDescriptionIcon } from "./FieldDescriptionIcon";

/**
 * The switch's `"cards"` layout: the track with its label beside it, hint and error
 * indented to start under that label.
 */
export function SwitchChip({
  id,
  label,
  required,
  description,
  hasError,
  errorMsg,
  hint,
  track,
}: {
  id: string;
  label?: ReactNode;
  required?: boolean;
  description?: string;
  hasError: boolean;
  errorMsg?: string;
  hint?: ReactNode;
  track: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      {/* The icon sits outside the `<label>`: inside it, a click would toggle the
          switch and the description would join the checkbox's accessible name. */}
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="flex items-center gap-3 cursor-pointer group">
          {track}
          {label && (
            <span className="min-w-0 text-[.8125rem] font-medium text-body">
              {label}
              {required && (
                <span className="text-danger ml-1">
                  *<span className="sr-only"> required</span>
                </span>
              )}
            </span>
          )}
        </label>
        {description && (
          <FieldDescriptionIcon
            descriptionId={`${id}-desc`}
            description={description}
          />
        )}
      </div>
      {/* Indented past the track, so both lines start under the label. */}
      {!hasError && hint && <div className="ml-[50px]">{hint}</div>}
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
