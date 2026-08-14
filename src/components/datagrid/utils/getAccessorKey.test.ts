import { describe, expect, it } from "vitest";

import type { WithMeta } from "../types/column";
import { computeDefaults } from "./getAccessorKey";

type Row = { id: number; name: string; price: number; active: boolean };

const col = (
  accessorKey: string,
  meta?: WithMeta<Row>["meta"]
): WithMeta<Row> => ({ accessorKey, meta }) as WithMeta<Row>;

/**
 * `computeDefaults` seeds the edit form, so it must read `toForm` and never `format`.
 * Reading the display hook here would put "1 234 €" into the input and submit it back.
 */
describe("computeDefaults", () => {
  const row: Row = { id: 1, name: "Leanne", price: 1234, active: true };

  it("passes raw values through when no hook is declared", () => {
    const d = computeDefaults(row, [col("name"), col("price")]) as Row;
    expect(d.name).toBe("Leanne");
    expect(d.price).toBe(1234);
  });

  it("ignores `format` entirely — that is display only now", () => {
    const d = computeDefaults(row, [
      col("price", { format: (v) => `${v} €` }),
    ]) as Row;
    expect(d.price).toBe(1234);
    expect(d.price).not.toBe("1234 €");
  });

  it("applies `toForm` when declared", () => {
    const d = computeDefaults(row, [
      col("price", { toForm: (v) => String(v) }),
    ]) as unknown as { price: string };
    expect(d.price).toBe("1234");
  });

  it("gives `toForm` the whole row as its second argument", () => {
    const d = computeDefaults(row, [
      col("name", { toForm: (v, r) => `${v} (#${(r as Row).id})` }),
    ]) as Row;
    expect(d.name).toBe("Leanne (#1)");
  });

  /* Anything seeded here comes back out of `handleSubmit` and gets posted, so a field no
     column declares — an audit stamp, a server-side timestamp, a nested relation — must
     not be in the form at all. */
  it("drops row fields that no column declares", () => {
    const d = computeDefaults(row, [col("name")]) as Row;
    expect(d.name).toBe("Leanne");
    expect(d.id).toBeUndefined();
  });

  it("reads and writes a nested accessor key as a path", () => {
    const nested = { user: { name: "Leanne" } } as unknown as Row;
    const d = computeDefaults(nested, [
      col("user.name", { toForm: (v) => String(v).toUpperCase() }),
    ]) as unknown as { user: { name: string } };
    expect(d.user.name).toBe("LEANNE");
  });

  describe("creating (no row)", () => {
    it("seeds an editor's declared default", () => {
      const d = computeDefaults(undefined, [
        col("name", { editor: "text", default: "untitled" }),
      ]) as Row;
      expect(d.name).toBe("untitled");
    });

    it("seeds false for a switch and empty string otherwise", () => {
      const d = computeDefaults(undefined, [
        col("active", { editor: "switch" }),
        col("name", { editor: "text" }),
      ]) as Row;
      expect(d.active).toBe(false);
      expect(d.name).toBe("");
    });

    it("leaves columns with no editor alone", () => {
      const d = computeDefaults(undefined, [col("name")]) as Row;
      expect(d.name).toBeUndefined();
    });
  });

  it("survives a column with no accessorKey", () => {
    expect(() =>
      computeDefaults(row, [{ id: "__custom__" } as WithMeta<Row>])
    ).not.toThrow();
  });
});
