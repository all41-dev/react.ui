import type { Column } from "@tanstack/react-table";
import type { ColumnFilterMeta } from "../../../types/column";

/*
 * Short controls on the inset surface, so the filter row reads as a recessed strip under
 * the header rather than a second toolbar.
 */
const baseControl =
  "block w-full h-[26px] rounded-control border border-border-default bg-surface-inset text-[.75rem] text-body " +
  "outline-none focus:border-accent focus:ring-2 focus:ring-[var(--rui-focus-ring)]";

export const inputClass = `${baseControl} px-[7px]`;
export const selectClass = `${baseControl} appearance-none pl-[7px] pr-6`;

type FilterOf<K extends ColumnFilterMeta["type"]> = Extract<
  ColumnFilterMeta,
  { type: K }
>;

export type FilterProps<
  TRow extends object,
  K extends ColumnFilterMeta["type"],
> = {
  col: Column<TRow, unknown>;
  cfg: FilterOf<K>;
  /**
   * Accessible name for the control. These are bare inputs in a header cell with no
   * visible label of their own, so without this a screen reader announces "combobox"
   * with no indication of which column it filters.
   */
  label: string;
};
