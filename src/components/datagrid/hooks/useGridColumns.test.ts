import { describe, expect, it } from "vitest";

import { getColId } from "./useGridColumns";

/**
 * `getColId` has to reproduce TanStack's own id rule exactly. Where the two disagree the
 * grid keys a column one way and the table keys it another, and column visibility,
 * ordering and cell editing all silently attach to the wrong id.
 *
 * The rule, from `table-core/core/column.js`:
 *   id ?? accessorKey.replaceAll('.', '_') ?? (typeof header === 'string' ? header : —)
 */
describe("getColId", () => {
  it("prefers an explicit id", () => {
    expect(getColId({ id: "nameCol", accessorKey: "name" })).toBe("nameCol");
  });

  it("replaces dots in an accessor key, as TanStack does", () => {
    expect(getColId({ accessorKey: "user.name" })).toBe("user_name");
  });

  it("falls back to a plain-string header", () => {
    expect(getColId({ header: "Total" })).toBe("Total");
  });

  it("ignores a non-string header", () => {
    expect(getColId({ header: () => null })).toBe("");
  });
});
