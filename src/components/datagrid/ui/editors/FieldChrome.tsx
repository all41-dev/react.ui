import type { ReactNode } from "react";

import { FieldDescriptionIcon } from "./FieldDescriptionIcon";

/**
 * The vertical layout every plain editor sits in: micro-label (with an info icon
 * carrying the description as a tooltip), the control, then the hint and the error line.
 * The description also lives in an sr-only span for `aria-describedby`.
 */
export function FieldChrome({
  id,
  label,
  required,
  description,
  hasError,
  errorMsg,
  hint,
  children,
}: {
  /** The control's DOM id; the hint and error ids are derived from it. */
  id: string;
  label?: ReactNode;
  required?: boolean;
  description?: string;
  hasError: boolean;
  errorMsg?: string;
  /** Value-derived text under the control. An error takes its place. */
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      {/* A micro-label in the faint tone, kept quiet so it doesn't compete with the
          value it introduces. The icon is a sibling of the label, not a child — inside
          it, the description would join the control's accessible name. */}
      {(label || description) && (
        <div className="flex items-center gap-1.5">
          {label && (
            <label
              htmlFor={id}
              className="block text-[.625rem] font-bold uppercase tracking-[.05em] text-faint"
            >
              {label}
              {required && (
                // The asterisk was visual only; give it a text equivalent.
                <span className="text-danger ml-1">
                  *<span className="sr-only"> required</span>
                </span>
              )}
            </label>
          )}
          {description && (
            <FieldDescriptionIcon
              descriptionId={`${id}-desc`}
              description={description}
            />
          )}
        </div>
      )}
      <div>
        {children}
        {!hasError && hint}
        {hasError && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1 text-[.6875rem] font-semibold text-danger"
          >
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
