import type { InputHTMLAttributes } from "react";

import type { EditorVariant } from "./editorChrome";

/* A 38×21 track with a 15px knob. Smaller than a default toggle, which looks oversized
   next to 32px fields. */
const trackClass =
  "block h-[21px] w-[38px] rounded-full border border-border-translucent bg-surface-raised transition-[background-color,border-color] duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--rui-focus-ring)] peer-checked:border-accent peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:h-[15px] after:w-[15px] after:rounded-full after:bg-muted after:transition-[transform,background-color] after:duration-200 after:content-[''] peer-checked:after:translate-x-[17px] peer-checked:after:bg-accent-contrast";

/* In a cell there is no error line, so the track itself shows the invalid state. */
const invalidTrackClass = "border-danger ring-1 ring-danger/40";

/**
 * The input and its track. The text label is the caller's, so both switch layouts can
 * place it — but the track itself must be clickable in both, and the input is `sr-only`.
 */
export function SwitchTrack({
  id,
  checked,
  onChange,
  hasError,
  required,
  describedBy,
  ariaLabel,
  anchorProps,
  inputProps,
  variant,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hasError: boolean;
  required?: boolean;
  describedBy?: string;
  /** The field's name when no text label is rendered (the `"cell"` variant). */
  ariaLabel?: string;
  /**
   * Tooltip anchor attributes. Set on the input, which takes focus, and on the wrapper,
   * which takes the pointer: the input is `sr-only`, so it can be focused but not hovered.
   */
  anchorProps?: Record<string, string>;
  /** Consumer `editorProps`, minus `className` — an override would break `sr-only peer`. */
  inputProps?: Record<string, unknown>;
  /** `"cards"` means the chip already wraps the track in a label of its own. */
  variant?: EditorVariant;
}) {
  const track =
    hasError && variant === "cell" ? `${trackClass} ${invalidTrackClass}` : trackClass;

  return (
    <span className="relative inline-flex items-center" {...anchorProps}>
      <input
        type="checkbox"
        id={id}
        aria-invalid={hasError || undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        className="sr-only peer"
        {...(inputProps as unknown as InputHTMLAttributes<HTMLInputElement>)}
        /* After the spread, like the plain editors do: consumer `editorProps` may
           add attributes, but it must not take over the controlled binding or the
           accessible name. */
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...anchorProps}
      />
      {/* In a cards section the chip's label wraps the track. Anywhere else nothing
          does — the micro-label sits on the row above, or a cell has none — so the
          track carries `htmlFor` itself, or the sr-only input is the only thing a
          pointer can reach. Either way it stays the input's next sibling, which is what
          the `peer-` classes read. */}
      {variant === "cards" ? (
        <span className={track} />
      ) : (
        <label htmlFor={id} className={`${track} cursor-pointer`} />
      )}
    </span>
  );
}
