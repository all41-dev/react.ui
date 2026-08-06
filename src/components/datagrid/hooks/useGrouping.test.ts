import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGroupBuckets } from "./useGrouping";
import { EMPTY_GROUP_LABEL, type GroupOption } from "../types/grouping";

type Row = { role: string; amount: number };

/** Minimal stand-in for a TanStack Row: the bucketer uses getValue then falls back. */
const row = (original: Row) =>
  ({
    original,
    getValue: (k: string) => (original as unknown as Record<string, unknown>)[k],
  }) as never;

const ROWS = [
  row({ role: "admin", amount: 10 }),
  row({ role: "editor", amount: 5 }),
  row({ role: "admin", amount: 2 }),
  row({ role: "", amount: 1 }),
];

const byRole: GroupOption = { key: "role", label: "Role" };

describe("useGroupBuckets", () => {
  const bucket = (option: GroupOption | undefined, agg: string[] = []) =>
    renderHook(() => useGroupBuckets(ROWS, option, agg)).result.current;

  it("returns undefined when no grouping is active", () => {
    expect(bucket(undefined)).toBeUndefined();
  });

  it("partitions rows by the grouping key", () => {
    const groups = bucket(byRole)!;
    const admin = groups.find((g) => g.key === "admin")!;
    expect(admin.rows).toHaveLength(2);
    expect(groups.find((g) => g.key === "editor")!.rows).toHaveLength(1);
  });

  it("collects empty values into one bucket, ordered last", () => {
    const groups = bucket(byRole)!;
    expect(groups.at(-1)!.key).toBe(EMPTY_GROUP_LABEL);
  });

  it("preserves incoming row order inside a bucket", () => {
    // Grouping partitions the already-sorted model; sorting must still apply within.
    const admin = bucket(byRole)!.find((g) => g.key === "admin")!;
    expect(admin.rows.map((r) => (r.original as Row).amount)).toEqual([10, 2]);
  });

  it("sums the aggregate columns per group", () => {
    const admin = bucket(byRole, ["amount"])!.find((g) => g.key === "admin")!;
    expect(admin.sums.amount).toBe(12);
  });

  it("ignores non-numeric values when summing", () => {
    const rows = [row({ role: "a", amount: 5 }), row({ role: "a" } as Row)];
    const groups = renderHook(() =>
      useGroupBuckets(rows, { key: "role", label: "R" }, ["amount"])
    ).result.current!;
    expect(groups[0].sums.amount).toBe(5);
  });

  describe("declared values", () => {
    const declared: GroupOption = {
      key: "role",
      label: "Role",
      values: [
        { value: "editor", label: "Editors", color: "#f00" },
        { value: "admin", label: "Admins" },
      ],
    };

    it("fixes bucket order and carries label and colour through", () => {
      const groups = bucket(declared)!;
      expect(groups[0].key).toBe("editor");
      expect(groups[0].label).toBe("Editors");
      expect(groups[0].color).toBe("#f00");
      expect(groups[1].key).toBe("admin");
    });

    it("still surfaces values the declared list does not cover", () => {
      const keys = bucket(declared)!.map((g) => g.key);
      expect(keys).toContain(EMPTY_GROUP_LABEL);
    });

    it("keeps a declared bucket that has no rows", () => {
      const withGhost: GroupOption = {
        key: "role",
        label: "Role",
        values: [{ value: "ghost", label: "Ghost" }],
      };
      const groups = bucket(withGhost)!;
      const ghost = groups.find((g) => g.key === "ghost");
      expect(ghost).toBeDefined();
      expect(ghost!.rows).toHaveLength(0);
    });
  });
});
