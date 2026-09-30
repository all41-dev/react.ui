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

    it("lays a seed over the defaults, for declared columns only", () => {
      const d = computeDefaults(
        undefined,
        [col("name", { editor: "text", default: "untitled" }), col("price")],
        { name: "Seeded", price: 5, undeclared: true }
      ) as Row & { undeclared?: boolean };
      expect(d.name).toBe("Seeded");
      // No editor, but the seed names it, so the value reaches the submit.
      expect(d.price).toBe(5);
      expect(d.undeclared).toBeUndefined();
    });

    it("hands a seed to the form as is, not through toForm", () => {
      const d = computeDefaults(
        undefined,
        [col("price", { editor: "number", toForm: (v) => Number(v) / 100 })],
        { price: 12 }
      ) as Row;
      expect(d.price).toBe(12);
    });

    it("reads a nested seed by the column's dotted key", () => {
      const d = computeDefaults(undefined, [col("user.name", { editor: "text" })], {
        user: { name: "Seeded" },
      }) as unknown as { user: { name: string } };
      expect(d.user.name).toBe("Seeded");
    });
  });

  it("ignores a seed when editing a row", () => {
    const d = computeDefaults(row, [col("name")], { name: "Seeded" }) as Row;
    expect(d.name).toBe("Leanne");
  });

  it("survives a column with no accessorKey", () => {
    expect(() =>
      computeDefaults(row, [{ id: "__custom__" } as WithMeta<Row>])
    ).not.toThrow();
  });
});
