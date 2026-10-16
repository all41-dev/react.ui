import type { Row } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";

import type { GroupBucket } from "../types/grouping";
import { placeDraft, type BodyItem } from "./useVirtualRows";

type Unit = { id: string };

/* Only `id` and `depth` are read off a row when the draft is placed. */
const row = (id: string, depth = 0) =>
  ({ kind: "row", row: { id, depth } as unknown as Row<Unit> }) as BodyItem<Unit>;

const group = (key: string) =>
  ({ kind: "group", group: { key } as unknown as GroupBucket<Row<Unit>> }) as BodyItem<Unit>;

/** The item list as text: `r:<id>`, `g:<key>`, `d@<depth>`. */
const shape = (items: BodyItem<Unit>[]) =>
  items.map((it) =>
    it.kind === "row" ? `r:${it.row.id}` : it.kind === "group" ? `g:${it.group.key}` : `d@${it.depth}`
  );

/*
 * Engineering (1)      Sales (4)
 * └ Platform (2)       └ EMEA (5)
 *   └ Infra (3)
 */
const TREE = [row("1", 0), row("2", 1), row("3", 2), row("4", 0), row("5", 1)];

describe("placeDraft", () => {
  it("puts the draft first in a flat grid", () => {
    const items = [row("a"), row("b")];
    expect(shape(placeDraft(items, { tree: false }))).toEqual(["d@0", "r:a", "r:b"]);
  });

  it("puts the draft before the first group header when grouped", () => {
    const items = [group("x"), row("a"), group("y"), row("b")];
    expect(shape(placeDraft(items, { tree: false }))).toEqual([
      "d@0",
      "g:x",
      "r:a",
      "g:y",
      "r:b",
    ]);
  });

  it("follows the last root's subtree when a tree draft names no parent", () => {
    expect(shape(placeDraft(TREE, { tree: true }))).toEqual([
      "r:1",
      "r:2",
      "r:3",
      "r:4",
      "r:5",
      "d@0",
    ]);
  });

  it("follows the parent's whole visible subtree, one level below the parent", () => {
    expect(shape(placeDraft(TREE, { tree: true, parentKey: "1" }))).toEqual([
      "r:1",
      "r:2",
      "r:3",
      "d@1",
      "r:4",
      "r:5",
    ]);
  });

  it("sits right under a parent whose children are not on screen", () => {
    const closed = [row("1", 0), row("4", 0), row("5", 1)];
    expect(shape(placeDraft(closed, { tree: true, parentKey: "1" }))).toEqual([
      "r:1",
      "d@1",
      "r:4",
      "r:5",
    ]);
  });

  it("takes its depth from the parent row", () => {
    const placed = placeDraft(TREE, { tree: true, parentKey: "3" });
    expect(shape(placed)).toEqual(["r:1", "r:2", "r:3", "d@3", "r:4", "r:5"]);
    const draft = placed.find((it) => it.kind === "draft");
    expect(draft).toEqual({ kind: "draft", parentKey: "3", depth: 3 });
  });

  it("falls back to a root at the end when the parent is not on screen", () => {
    const filtered = [row("4", 0), row("5", 1)];
    expect(shape(placeDraft(filtered, { tree: true, parentKey: "1" }))).toEqual([
      "r:4",
      "r:5",
      "d@0",
    ]);
  });

  it("does not alter the list it was given", () => {
    const items = [row("a")];
    placeDraft(items, { tree: false });
    expect(shape(items)).toEqual(["r:a"]);
  });
});
