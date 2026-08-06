import { describe, expect, it } from "vitest";

import type { WithMeta } from "../types/column";
import { computeDefaults } from "./getAccessorKey";

type Row = { id: number; name: string; price: number; active: boolean };

const col = (
  accessorKey: string,
  meta?: WithMeta<Row>["meta"]
): WithMeta<Row> => ({ accessorKey, meta }) as WithMeta<Row>;

/**
 * §3.6. `computeDefaults` seeds the edit form. It used to call `format` — the DISPLAY
 * hook — so a column rendering 1234 as "1 234 €" put that string into the input and
 * submitted it back. `toForm` is the hook that belongs here; `format` must not be
 * consulted at all.
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

  it("keeps row fields that have no column", () => {
    const d = computeDefaults(row, [col("name")]) as Row;
    expect(d.id).toBe(1);
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
