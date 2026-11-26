import { useRef, type KeyboardEvent, type ReactNode } from "react";

/*
 * A choice of one among a few, shown side by side: a `radiogroup` of buttons,
 * the chosen one tinted. For a view or a mode, where a tab list would promise
 * panels and a select would hide the options. One tab stop; the arrow keys,
 * Home and End move to an option and choose it, skipping the disabled ones.
 * With `activateOnArrow` off they only move, and Space or Enter chooses.
 * A trailing control may share the box, after a hairline, outside the group.
 */

const STEP: Partial<Record<string, number>> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** The accessible name when the label is not text that says it. */
  name?: string;
  /** Shown and announced, but cannot be chosen. */
  disabled?: boolean;
  title?: string;
  /** Asked for and not yet answered: tinted as chosen, and announced busy. */
  busy?: boolean;
};

/*
 * A text label holds the room of its chosen weight in a hidden pseudo-element,
 * so choosing an option changes no width.
 */
const boxClass = "flex h-7 flex-none items-center rounded-md border border-border-default p-0.5 text-xs";

const HELD_WIDTH_CLASS =
  "flex flex-col items-center after:invisible after:block after:h-0 after:overflow-hidden after:font-medium after:content-[attr(data-label)]";

export function SegmentedSwitch<T extends string>({
  label,
  value,
  options,
  onChange,
  trailing,
  activateOnArrow = true,
}: {
  /** Names the group for assistive tech. */
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  /** A control drawn in the same box, after the options. */
  trailing?: ReactNode;
  /** Off for a choice with consequences: the arrows then move focus without choosing. */
  activateOnArrow?: boolean;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.flatMap((o, i) => (o.disabled ? [] : [i]));
  const checked = options.findIndex((o) => o.value === value);
  // The tab stop: the chosen option, else the first that can be chosen.
  const stop = checked >= 0 ? checked : (enabled[0] ?? 0);

  const onKeyDown = (event: KeyboardEvent) => {
    if (enabled.length === 0) return;
    const focused = buttons.current.findIndex((b) => b === event.currentTarget);
    const at = enabled.indexOf(!activateOnArrow && enabled.includes(focused) ? focused : stop);
    const step = STEP[event.key];
    const next =
      event.key === "Home"
        ? enabled[0]
        : event.key === "End"
          ? enabled[enabled.length - 1]
          : step === undefined
            ? undefined
            : enabled[(at + step + enabled.length) % enabled.length];
    if (next === undefined) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    if (activateOnArrow && next !== checked) onChange(options[next].value);
  };

  const group = (
    <div
      role="radiogroup"
      aria-label={label}
      className={trailing ? "flex h-full items-center" : boxClass}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role="radio"
            tabIndex={index === stop ? 0 : -1}
            onKeyDown={onKeyDown}
            aria-checked={active}
            aria-label={option.name}
            aria-disabled={option.disabled || undefined}
            aria-busy={option.busy || undefined}
            title={option.title}
            onClick={() => {
              if (!option.disabled && !active) onChange(option.value);
            }}
            className={`flex h-full items-center gap-1.5 rounded px-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] ${
              active
                ? "bg-accent-subtle font-medium text-accent"
                : option.busy
                  ? "cursor-progress bg-accent-subtle font-medium text-accent"
                  : option.disabled
                  ? "cursor-not-allowed text-muted"
                  : "cursor-pointer text-muted hover:bg-surface-raised"
            }`}
          >
            {typeof option.label === "string" ? (
              <span data-label={option.label} className={HELD_WIDTH_CLASS}>
                {option.label}
              </span>
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );

  if (!trailing) return group;
  return (
    <div className={boxClass}>
      {group}
      <span aria-hidden="true" className="mx-0.5 h-4 w-px flex-none bg-border-default" />
      {trailing}
    </div>
  );
}
