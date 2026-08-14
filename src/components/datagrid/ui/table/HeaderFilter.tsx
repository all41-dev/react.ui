import type { Header } from "@tanstack/react-table";

import type { ColumnMeta } from "../../types/column";
import { BooleanFilter } from "./filters/BooleanFilter";
import { DateRangeFilter } from "./filters/DateRangeFilter";
import { SelectFilter } from "./filters/SelectFilter";
import { TextFilter } from "./filters/TextFilter";

/**
 * The filter control for one header cell, dispatched on `meta.filter.type`.
 *
 * Each kind is its own component so its hooks run unconditionally. With all of them in
 * one function behind `if (cfg.type === …)` branches, after an early `return null`, a
 * column whose filter config or `getCanFilter()` changed at runtime crashed with
 * "rendered fewer hooks than expected".
 */
export function HeaderFilter<TRow extends object>({
  h,
}: {
  h: Header<TRow, unknown>;
}) {
  const col = h.column;
  const meta = (col.columnDef as { meta?: ColumnMeta<TRow, any> }).meta;
  const cfg = meta?.filter;
  if (!cfg || !col.getCanFilter()) return null;

  // The column's own name, for the control's accessible name. `header` is only usable
  // when it is a plain string — it can be an arbitrary renderer.
  const header = col.columnDef.header;
  const label =
    meta?.label ?? (typeof header === "string" && header ? header : col.id);

  switch (cfg.type) {
    case "text":
      return <TextFilter col={col} cfg={cfg} label={label} />;
    case "select":
      return <SelectFilter col={col} cfg={cfg} label={label} />;
    case "boolean":
      return <BooleanFilter col={col} cfg={cfg} label={label} />;
    case "dateRange":
      return <DateRangeFilter col={col} cfg={cfg} label={label} />;
    default:
      return null;
  }
}
