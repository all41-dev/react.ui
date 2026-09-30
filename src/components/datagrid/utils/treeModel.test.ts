import { describe, expect, it } from "vitest";

import { buildTree } from "./treeModel";

type Node = { id: number | string; parentId?: number | string | null; name?: string };

const keyOf = (n: Node) => String(n.id);
const ids = (rows: Node[] | undefined) => (rows ?? []).map((r) => r.id);

describe("buildTree", () => {
  it("nests rows under their parent", () => {
    const rows: Node[] = [
      { id: 1 },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 4 },
    ];
    const tree = buildTree(rows, keyOf, "parentId");

    expect(ids(tree.roots)).toEqual([1, 4]);
    expect(ids(tree.childrenOf.get("1"))).toEqual([2]);
    expect(ids(tree.childrenOf.get("2"))).toEqual([3]);
    expect(tree.childrenOf.has("3")).toBe(false);
    expect(tree.parentOf.get("3")).toBe("2");
  });

  it("keeps input order among siblings, whatever order the parents arrive in", () => {
    const rows: Node[] = [
      { id: "c", parentId: "root" },
      { id: "a", parentId: "root" },
      { id: "root" },
      { id: "b", parentId: "root" },
    ];
    const tree = buildTree(rows, keyOf, "parentId");

    expect(ids(tree.roots)).toEqual(["root"]);
    expect(ids(tree.childrenOf.get("root"))).toEqual(["c", "a", "b"]);
  });

  it("treats an empty or null parent as a root", () => {
    const rows: Node[] = [
      { id: 1, parentId: null },
      { id: 2, parentId: "" },
      { id: 3 },
    ];
    const tree = buildTree(rows, keyOf, "parentId");

    expect(ids(tree.roots)).toEqual([1, 2, 3]);
    expect(tree.orphanCount).toBe(0);
  });

  it("makes a row whose parent is missing a root, and counts it", () => {
    const rows: Node[] = [{ id: 1 }, { id: 2, parentId: 99 }, { id: 3, parentId: 2 }];
    const tree = buildTree(rows, keyOf, "parentId");

    expect(ids(tree.roots)).toEqual([1, 2]);
    expect(ids(tree.childrenOf.get("2"))).toEqual([3]);
    expect(tree.orphanCount).toBe(1);
  });

  it("breaks a two-node cycle at its first row", () => {
    const rows: Node[] = [
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
    ];
    const tree = buildTree(rows, keyOf, "parentId");

    expect(ids(tree.roots)).toEqual(["a"]);
    expect(ids(tree.childrenOf.get("a"))).toEqual(["b"]);
    expect(tree.cycleCount).toBe(1);
  });

  it("keeps a row hanging below a cycle under it", () => {
    const rows: Node[] = [
      { id: "leaf", parentId: "a" },
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
    ];
    const tree = buildTree(rows, keyOf, "parentId");

    expect(ids(tree.roots)).toEqual(["a"]);
    expect(ids(tree.childrenOf.get("a"))).toEqual(["leaf", "b"]);
  });

  it("makes a row that is its own parent a root", () => {
    const rows: Node[] = [{ id: 1, parentId: 1 }, { id: 2, parentId: 1 }];
    const tree = buildTree(rows, keyOf, "parentId");

    expect(ids(tree.roots)).toEqual([1]);
    expect(ids(tree.childrenOf.get("1"))).toEqual([2]);
    expect(tree.cycleCount).toBe(1);
  });

  it("reads the parent through a dotted path", () => {
    const rows = [
      { id: 1, parent: null },
      { id: 2, parent: { id: 1 } },
    ];
    const tree = buildTree(rows, (r) => String(r.id), "parent.id");

    expect(tree.roots.map((r) => r.id)).toEqual([1]);
    expect(tree.childrenOf.get("1")?.map((r) => r.id)).toEqual([2]);
  });

  it("compares numeric and string ids as text", () => {
    const rows: Node[] = [{ id: 1 }, { id: "2", parentId: "1" }, { id: 3, parentId: 2 }];
    const tree = buildTree(rows, keyOf, "parentId");

    expect(ids(tree.roots)).toEqual([1]);
    expect(ids(tree.childrenOf.get("1"))).toEqual(["2"]);
    expect(ids(tree.childrenOf.get("2"))).toEqual([3]);
  });

  it("lists descendants parents-first and ancestors nearest-first", () => {
    const rows: Node[] = [
      { id: 1 },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 2 },
      { id: 4, parentId: 1 },
      { id: 5, parentId: 4 },
    ];
    const tree = buildTree(rows, keyOf, "parentId");

    expect(tree.descendantsOf("1")).toEqual(["2", "3", "4", "5"]);
    expect(tree.descendantsOf("3")).toEqual([]);
    expect(tree.ancestorsOf("5")).toEqual(["4", "1"]);
    expect(tree.ancestorsOf("1")).toEqual([]);
    expect(tree.has("5")).toBe(true);
    expect(tree.has("6")).toBe(false);
  });
});
