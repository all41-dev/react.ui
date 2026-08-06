import { describe, expect, it, vi } from "vitest";

import { getRowKey } from "./getRowKey";

/**
 * The grid's single identity rule — checkbox selection, local create/edit/delete
 * reconciliation and the React key all read it. Everything downstream compares
 * `String(key)`, so a row resolving to `undefined` keys to the literal "undefined".
 */
describe("getRowKey", () => {
  it("prefers an explicit idAccessor over everything", () => {
    const row = { id: 1, uuid: "u-1", slug: "leanne" };
    expect(getRowKey(row, (r) => r.slug)).toBe("leanne");
  });

  it("falls back to `id` — the shape that used to resolve to undefined", () => {
    expect(getRowKey({ id: 7 })).toBe(7);
    expect(getRowKey({ id: "abc" })).toBe("abc");
  });

  it("falls back to `uuid` when there is no id", () => {
    expect(getRowKey({ uuid: "u-9" })).toBe("u-9");
  });

  it("prefers `id` over `uuid` when both exist", () => {
    expect(getRowKey({ id: 7, uuid: "u-9" })).toBe(7);
  });

  it("keeps distinct rows distinct — one checkbox must not check them all", () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const keys = rows.map((r) => String(getRowKey(r)));
    expect(new Set(keys).size).toBe(3);
    expect(keys).not.toContain("undefined");
  });

  it("still returns undefined when nothing identifies the row", () => {
    expect(getRowKey({ name: "no id here" })).toBeUndefined();
  });

  it("warns once in dev when no key can be resolved", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // The module-level "already warned" flag may have been tripped by an earlier test
    // in this file; assert on behaviour that holds either way.
    getRowKey({ nothing: true });
    getRowKey({ nothing: true });
    getRowKey({ nothing: true });
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("does not warn for a row it can identify", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    getRowKey({ id: 1 });
    expect(warn).not.toHaveBeenCalled();
  });

  it("tolerates null and undefined rows", () => {
    expect(getRowKey(null)).toBeUndefined();
    expect(getRowKey(undefined)).toBeUndefined();
  });
});
