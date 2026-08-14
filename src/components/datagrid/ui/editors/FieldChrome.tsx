import type { ReactNode } from "react";

/**
 * The vertical layout every plain editor sits in: micro-label, the control, then hint
 * or error. The error replaces the hint rather than stacking under it — one line of
 * guidance per field.
 */
export function FieldChrome({
  id,
  label,
  required,
  description,
  hasError,
  errorMsg,
  children,
}: {
  /** The control's DOM id; the hint and error ids are derived from it. */
  id: string;
  label?: ReactNode;
  required?: boolean;
  description?: string;
  hasError: boolean;
  errorMsg?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      {/* A micro-label in the faint tone, kept quiet so it doesn't compete
          with the value it introduces. */}
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
      <div>
        {children}
        {description && !hasError && (
          <p id={`${id}-desc`} className="mt-1 text-[.6875rem] text-faint">
            {description}
          </p>
        )}
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
