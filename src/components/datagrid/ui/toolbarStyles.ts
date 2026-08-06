/*
 * Shared by the toolbar and its overflow menu. Kept in its own module rather than
 * exported from DataGridToolbar, which would make the two files import each other.
 *
 * The 30px toolbar control. Transparent at rest so the toolbar reads as one surface, and
 * on hover it lifts to `--surface-raised` with a translucent edge — an accent border here
 * would make every hover look like a selection.
 */
export const BTN =
  "inline-flex h-[30px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-control " +
  "border px-2.5 text-[.8125rem] outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]";

export const BTN_OFF =
  "border-border-default bg-transparent text-muted hover:border-border-translucent hover:bg-surface-raised hover:text-body";

export const BTN_ON =
  "border-[color-mix(in_srgb,var(--rui-accent)_50%,transparent)] bg-accent-subtle font-semibold text-accent";

/** A full-width row inside the overflow panel. */
export const MENU_ITEM =
  "flex w-full cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-left " +
  "text-[.8125rem] text-body outline-none transition-colors hover:bg-surface-inset " +
  "focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]";
