import { describe, expect, it } from "vitest";
import { byName, sortTree } from "./sortTree";

type Item = { id: string; parentId: string | null; name: string };
const item = (id: string, parentId: string | null, name = id): Item => ({ id, parentId, name });

describe("sortTree", () => {
  it("keeps each parent before its children and orders siblings by name", () => {
    const items = [item("zeta", null), item("z.b", "zeta", "b"), item("z.a", "zeta", "a"), item("Alpha", null)];
    expect(sortTree(items, (i) => i).map((i) => i.id)).toEqual(["Alpha", "zeta", "z.a", "z.b"]);
  });

  it("reads an item whose parent is missing as a root", () => {
    const items = [item("b", null), item("orphan", "gone", "a")];
    expect(sortTree(items, (i) => i).map((i) => i.id)).toEqual(["orphan", "b"]);
  });
});

describe("byName", () => {
  it("ignores case and reads digits as numbers", () => {
    expect(["item10", "Item2", "item1"].sort(byName)).toEqual(["item1", "Item2", "item10"]);
  });
});
