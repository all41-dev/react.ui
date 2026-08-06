import { describe, expect, it } from "vitest";

import {
  dgBoolean,
  dgDateRange,
  dgMultiSelect,
  dgSelect,
  dgText,
  filterFnFor,
  toDayString,
} from "./filterFns";

/**
 * These are the functions B1 was about: before them, TanStack inferred a filter from the
 * first row's value type and had no idea what shape the filter UI actually writes.
 * Each case below is one row of that mismatch table.
 */

/** Minimal stand-in for a TanStack Row — the fns only ever call `getValue`. */
const row = (value: unknown) =>
  ({ getValue: () => value }) as unknown as Parameters<typeof dgText>[0];

const run = (fn: typeof dgText, value: unknown, filterValue: unknown) =>
  fn(row(value), "col", filterValue, () => {});

describe("dgText", () => {
  it("matches case-insensitively on a substring", () => {
    expect(run(dgText, "Leanne Graham", "leanne")).toBe(true);
    expect(run(dgText, "Leanne Graham", "GRAHAM")).toBe(true);
    expect(run(dgText, "Leanne Graham", "ervin")).toBe(false);
  });

  it("coerces non-strings, so a text filter works on a number column", () => {
    // The auto fn picked `inNumberRange` here and choked on a string filter value.
    expect(run(dgText, 12345, "234")).toBe(true);
    expect(run(dgText, 12345, "999")).toBe(false);
  });

  it("keeps every row when the needle is empty or whitespace", () => {
    expect(run(dgText, "anything", "")).toBe(true);
    expect(run(dgText, "anything", "   ")).toBe(true);
  });

  it("drops null and undefined values rather than matching them", () => {
    expect(run(dgText, null, "a")).toBe(false);
    expect(run(dgText, undefined, "a")).toBe(false);
  });
});

describe("dgSelect", () => {
  it("matches exactly — the bug was 'Active' also matching 'Inactive'", () => {
    expect(run(dgSelect, "active", "active")).toBe(true);
    expect(run(dgSelect, "inactive", "active")).toBe(false);
  });

  it("compares as text so numeric ids match their string option values", () => {
    expect(run(dgSelect, 3, "3")).toBe(true);
    expect(run(dgSelect, "3", 3)).toBe(true);
  });

  it("keeps every row when nothing is selected", () => {
    expect(run(dgSelect, "active", undefined)).toBe(true);
    expect(run(dgSelect, "active", "")).toBe(true);
  });
});

describe("dgMultiSelect", () => {
  it("ORs across the selected options", () => {
    // Previously String(["a","b"]) → "a,b", which matched nothing at all.
    expect(run(dgMultiSelect, "admin", ["admin", "editor"])).toBe(true);
    expect(run(dgMultiSelect, "editor", ["admin", "editor"])).toBe(true);
    expect(run(dgMultiSelect, "user", ["admin", "editor"])).toBe(false);
  });

  it("keeps every row for an empty selection", () => {
    expect(run(dgMultiSelect, "admin", [])).toBe(true);
  });

  it("accepts a bare value as a one-element selection", () => {
    expect(run(dgMultiSelect, "admin", "admin")).toBe(true);
  });
});

describe("dgBoolean", () => {
  it("matches real booleans", () => {
    expect(run(dgBoolean, true, true)).toBe(true);
    expect(run(dgBoolean, false, true)).toBe(false);
    expect(run(dgBoolean, false, false)).toBe(true);
  });

  it("folds in the string and numeric spellings an API might send", () => {
    expect(run(dgBoolean, "true", true)).toBe(true);
    expect(run(dgBoolean, "No", false)).toBe(true);
    expect(run(dgBoolean, 1, true)).toBe(true);
    expect(run(dgBoolean, 0, false)).toBe(true);
  });

  it("treats a non-boolean filter value as 'Any'", () => {
    expect(run(dgBoolean, true, undefined)).toBe(true);
    expect(run(dgBoolean, false, undefined)).toBe(true);
  });

  it("keeps `false` as a meaningful filter value", () => {
    // The default falsy auto-remove would have silently dropped the "No" selection.
    expect(dgBoolean.autoRemove?.(false)).toBe(false);
    expect(dgBoolean.autoRemove?.(undefined)).toBe(true);
  });
});

describe("toDayString", () => {
  it("slices an ISO string rather than parsing it", () => {
    // `new Date("2026-08-06")` is UTC midnight, which reads back as the 5th west of GMT.
    expect(toDayString("2026-08-06T23:30:00Z")).toBe("2026-08-06");
    expect(toDayString("2026-08-06")).toBe("2026-08-06");
  });

  it("reads a Date in local time", () => {
    expect(toDayString(new Date(2026, 7, 6, 12))).toBe("2026-08-06");
  });

  it("returns undefined for empty and unparseable values", () => {
    expect(toDayString(null)).toBeUndefined();
    expect(toDayString("")).toBeUndefined();
    expect(toDayString("not a date")).toBeUndefined();
  });
});

describe("dgDateRange", () => {
  const at = (d: string) => (fv: unknown) => run(dgDateRange, d, fv);

  it("is inclusive on both ends", () => {
    // "to: the 6th" has to include everything that happened during the 6th.
    expect(at("2026-08-06")({ from: "2026-08-01", to: "2026-08-06" })).toBe(true);
    expect(at("2026-08-01")({ from: "2026-08-01", to: "2026-08-06" })).toBe(true);
  });

  it("excludes outside the range", () => {
    expect(at("2026-07-31")({ from: "2026-08-01", to: "2026-08-06" })).toBe(false);
    expect(at("2026-08-07")({ from: "2026-08-01", to: "2026-08-06" })).toBe(false);
  });

  it("supports an open-ended range", () => {
    expect(at("2026-12-25")({ from: "2026-08-01" })).toBe(true);
    expect(at("2026-01-01")({ from: "2026-08-01" })).toBe(false);
    expect(at("2026-01-01")({ to: "2026-08-01" })).toBe(true);
  });

  it("keeps every row when both ends are empty", () => {
    expect(at("2026-08-06")({})).toBe(true);
    expect(at("2026-08-06")(undefined)).toBe(true);
    expect(dgDateRange.autoRemove?.({ from: "", to: "" })).toBe(true);
  });

  it("drops rows whose value is not a date", () => {
    expect(run(dgDateRange, "n/a", { from: "2026-01-01" })).toBe(false);
  });

  it("handles a timestamp column", () => {
    expect(
      run(dgDateRange, new Date(2026, 7, 6, 9, 30).getTime(), {
        from: "2026-08-06",
        to: "2026-08-06",
      })
    ).toBe(true);
  });
});

describe("filterFnFor", () => {
  it("maps each filter kind to its function", () => {
    expect(filterFnFor({ type: "text" })).toBe(dgText);
    expect(filterFnFor({ type: "select", options: [] })).toBe(dgSelect);
    expect(filterFnFor({ type: "boolean" })).toBe(dgBoolean);
    expect(filterFnFor({ type: "dateRange" })).toBe(dgDateRange);
  });

  it("picks the multi variant from the config, not the type alone", () => {
    expect(filterFnFor({ type: "select", options: [], multi: true })).toBe(
      dgMultiSelect
    );
  });
});
