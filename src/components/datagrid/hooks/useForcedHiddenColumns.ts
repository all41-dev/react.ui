import { useMemo } from "react";

import type { WithMeta } from "../types/column";
import { BELOW_MD, useMediaQuery } from "./useMediaQuery";

/** Stable identity for "nothing forced hidden", so the visibility memo stays put. */
const NONE: string[] = [];

/**
 * Column ids the current viewport hides regardless of what the user chose — today only
 * `meta.hideOnMobile`.
 *
 * This goes through the column model rather than a `display:none` class. A hidden cell
 * still occupies a `<col>`, which shifts every following cell onto the wrong width under
 * `table-fixed`, and the class has to be repeated on the filter row, the group header and
 * the skeleton or those rows carry one cell more than the data rows. Leaving the model is
 * the only version where all of that stays in agreement.
 *
 * The result is also what keeps these columns out of the Columns popover: a column the
 * viewport owns must not be offered as a toggle the user cannot actually move.
 */
export function useForcedHiddenColumns<TRow extends object, TForm extends object>(
  baseCols: WithMeta<TRow, TForm>[],
  getColId: (c: WithMeta<TRow, TForm>) => string
): string[] {
  const belowMd = useMediaQuery(BELOW_MD);
  const mobileHiddenIds = useMemo(
    () => baseCols.filter((c) => c.meta?.hideOnMobile).map(getColId),
    [baseCols, getColId]
  );
  return belowMd ? mobileHiddenIds : NONE;
}
