import { describe, expect, it } from "vitest";

import type { WithMeta } from "../types/column";
import type { EditorKind } from "../types/column";
import { buildFormBlocks, type FormBlock } from "./formBlocks";
import { getAccessorKey } from "./getAccessorKey";

type Row = Record<string, unknown>;

const col = (
  key: string,
  meta: {
    editor?: EditorKind;
    group?: string;
    order?: number;
  } = {}
): WithMeta<Row, Row> => ({
  accessorKey: key,
  meta: {
    editor: meta.editor ?? "text",
    formLayout: { group: meta.group, order: meta.order },
  },
});

/** Blocks as `"field:key"` / `"group:id(keys)"`, so an assertion reads as a layout. */
const shape = (blocks: FormBlock<Row, Row>[]) =>
  blocks.map((b) =>
    b.kind === "field"
      ? `field:${getAccessorKey(b.field)}`
      : `group:${b.group.id}(${b.fields.map(getAccessorKey).join(",")})`
  );

describe("buildFormBlocks", () => {
  it("leaves ungrouped fields loose, in declaration order", () => {
    expect(shape(buildFormBlocks([col("a"), col("b")]))).toEqual([
      "field:a",
      "field:b",
    ]);
  });

  it("collects fields naming the same group, wherever they are declared", () => {
    const blocks = buildFormBlocks([
      col("street", { group: "address" }),
      col("name"),
      col("city", { group: "address" }),
    ]);

    expect(shape(blocks)).toEqual(["group:address(street,city)", "field:name"]);
  });

  it("puts a group where its earliest field sits", () => {
    const blocks = buildFormBlocks([
      col("street", { group: "address", order: 3 }),
      col("name", { order: 1 }),
      col("note", { order: 5 }),
    ]);

    expect(shape(blocks)).toEqual([
      "field:name",
      "group:address(street)",
      "field:note",
    ]);
  });

  it("lets a declared order on the group override its fields'", () => {
    const blocks = buildFormBlocks(
      [col("street", { group: "address", order: 3 }), col("name", { order: 1 })],
      [{ id: "address", order: 0 }]
    );

    expect(shape(blocks)).toEqual(["group:address(street)", "field:name"]);
  });

  it("collects ungrouped switches into Options, last and as cards", () => {
    const blocks = buildFormBlocks([
      col("active", { editor: "switch" }),
      col("name"),
    ]);

    expect(shape(blocks)).toEqual(["field:name", "group:options(active)"]);
    expect(blocks[1]).toMatchObject({
      group: { label: "Options", variant: "cards" },
    });
  });

  it("keeps a switch in the group it names instead of in Options", () => {
    const blocks = buildFormBlocks([
      col("active", { editor: "switch", group: "access" }),
      col("archived", { editor: "switch" }),
      col("role", { group: "access" }),
    ]);

    expect(shape(blocks)).toEqual([
      "group:access(active,role)",
      "group:options(archived)",
    ]);
  });

  it("takes the declared label, span and variant for a group", () => {
    const blocks = buildFormBlocks(
      [col("street", { group: "address" })],
      [{ id: "address", label: "Address", groupSpan: 1, columns: 1 }]
    );

    expect(blocks[0]).toMatchObject({
      group: { label: "Address", groupSpan: 1, columns: 1 },
    });
  });

  it("heads an undeclared group with its own id", () => {
    const blocks = buildFormBlocks([col("street", { group: "Address" })]);

    expect(blocks[0]).toMatchObject({ group: { id: "Address", label: "Address" } });
  });

  it("lets Options be declared like any other group", () => {
    const blocks = buildFormBlocks(
      [col("active", { editor: "switch" }), col("name", { order: 2 })],
      [{ id: "options", label: "Flags", order: 1, variant: "grid" }]
    );

    expect(shape(blocks)).toEqual(["group:options(active)", "field:name"]);
    expect(blocks[0]).toMatchObject({
      group: { label: "Flags", variant: "grid" },
    });
  });
});
