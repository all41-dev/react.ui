import type { FilterFn } from "@tanstack/react-table";

import type { ColumnFilterMeta } from "../types/column";

/*
 * One filter function per `meta.filter.type`. Every filtered column must be given one
 * explicitly — never rely on TanStack's `auto`, which picks a builtin from the FIRST
 * ROW'S value type and knows nothing about what the filter UI writes: a `select` on a
 * string column degrades to a substring match ("active" then matches "inactive"), a
 * multi-select stringifies to "a,b" and matches nothing, and a dateRange stringifies to
 * "[object Object]".
 *
 * All of these are pure and take (row, columnId, filterValue) — the cheapest possible
 * unit-test target.
 */

/** Empty-ish filter values must not filter anything out. TanStack calls this before running the fn. */
const autoRemoveEmpty = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** Contains, case-insensitive. Non-strings are coerced so numeric columns work too. */
export const dgText: FilterFn<unknown> = (row, columnId, filterValue) => {
  const needle = String(filterValue ?? "").toLowerCase().trim();
  if (needle === "") return true;
  const value = row.getValue(columnId);
  if (value === undefined || value === null) return false;
  return String(value).toLowerCase().includes(needle);
};
dgText.autoRemove = autoRemoveEmpty;

/** Exact match against the option's `value`, compared as text (ids arrive as string | number). */
export const dgSelect: FilterFn<unknown> = (row, columnId, filterValue) => {
  if (autoRemoveEmpty(filterValue)) return true;
  const value = row.getValue(columnId);
  if (value === undefined || value === null) return false;
  return String(value) === String(filterValue);
};
dgSelect.autoRemove = autoRemoveEmpty;

/** OR across the selected options. */
export const dgMultiSelect: FilterFn<unknown> = (row, columnId, filterValue) => {
  const selected = Array.isArray(filterValue) ? filterValue : [filterValue];
  if (selected.length === 0) return true;
  const value = row.getValue(columnId);
  if (value === undefined || value === null) return false;
  const text = String(value);
  return selected.some((s) => String(s) === text);
};
dgMultiSelect.autoRemove = autoRemoveEmpty;

/**
 * Truthiness with the string forms folded in — an API that serialises booleans as
 * "true"/"false" (or 0/1) is common enough that matching only real booleans would
 * silently filter everything out.
 */
const toBool = (v: unknown): boolean | undefined => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return undefined;
};

export const dgBoolean: FilterFn<unknown> = (row, columnId, filterValue) => {
  if (typeof filterValue !== "boolean") return true; // "Any"
  return toBool(row.getValue(columnId)) === filterValue;
};
// `false` is a MEANINGFUL filter value here, so the default falsy auto-remove would
// silently drop the "No" selection. Only an empty value clears this filter.
dgBoolean.autoRemove = (v: unknown) => v === undefined || v === null || v === "";

/**
 * Inclusive on both ends, compared as calendar days rather than instants — the filter
 * inputs are `<input type="date">`, so "to: 2026-08-06" has to include everything that
 * happened during the 6th, not stop at midnight.
 *
 * An ISO-ish string is sliced rather than parsed: `new Date("2026-08-06")` is UTC
 * midnight, which in a negative-offset timezone reads back as the 5th.
 */
const ISO_DAY = /^(\d{4}-\d{2}-\d{2})/;

export const toDayString = (v: unknown): string | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "string") {
    const m = ISO_DAY.exec(v.trim());
    if (m) return m[1];
  }
  const d = v instanceof Date ? v : new Date(v as string | number);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const dgDateRange: FilterFn<unknown> = (row, columnId, filterValue) => {
  const range = (filterValue ?? {}) as { from?: string; to?: string };
  const from = range.from || undefined;
  const to = range.to || undefined;
  if (!from && !to) return true;
  // yyyy-mm-dd is lexicographically ordered, so string compare is date compare.
  const day = toDayString(row.getValue(columnId));
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
};
dgDateRange.autoRemove = (v: unknown) => {
  if (autoRemoveEmpty(v)) return true;
  const r = v as { from?: string; to?: string };
  return !r.from && !r.to;
};

/**
 * `select` resolves to one of two functions depending on `multi`, so this is keyed by
 * the filter config rather than by `type` alone.
 *
 * The single row-type-erasure bridge: the fns above read cells through `row.getValue`
 * only, so they are written against `unknown` — but `FilterFn`'s row parameter makes it
 * invariant under `strictFunctionTypes`, and attaching one to a `ColumnDef<TRow>` needs
 * this cast.
 */
export function filterFnFor<TRow>(
  cfg: ColumnFilterMeta
): FilterFn<TRow> | undefined {
  const fn = (() => {
    switch (cfg.type) {
      case "text":
        return dgText;
      case "select":
        return cfg.multi ? dgMultiSelect : dgSelect;
      case "boolean":
        return dgBoolean;
      case "dateRange":
        return dgDateRange;
      default:
        return undefined;
    }
  })();
  return fn as FilterFn<TRow> | undefined;
}
