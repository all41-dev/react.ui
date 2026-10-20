import { describe, expect, it } from "vitest";

import { containerIds, visibleRows, type TreePickerRow } from "./treeRows";

/*
 * Which rows a tree draws: expansion without a query, and with one the matches with
 * their ancestors. A row whose parent is not in the list is a root.
 */

const row = (
  id: string,
  parentId: string | null,
  kind: TreePickerRow["kind"] = "leaf"
): TreePickerRow => ({ id, parentId, kind, name: id });

/*
 * address { street, geo { lat } }   name   tags[]   orphan (parent not listed)
 */
const ROWS: TreePickerRow[] = [
  row("address", null, "object"),
  row("street", "address"),
  row("geo", "address", "object"),
  row("lat", "geo"),
  row("name", null),
  row("tags", null, "array"),
  row("orphan", "gone"),
];

const ids = (expanded: Iterable<string>, query: string) =>
  visibleRows(ROWS, new Set(expanded), query).map((v) => v.row.id);

describe("visibleRows", () => {
  it("lists a container before its children when expanded, and hides them when collapsed", () => {
    expect(ids(["address", "geo"], "")).toEqual([
      "address",
      "street",
      "geo",
      "lat",
      "name",
      "tags",
      "orphan",
    ]);
    expect(ids(["address"], "")).toEqual(["address", "street", "geo", "name", "tags", "orphan"]);
  });

  it("carries depth, whether a row has children, and whether it is expanded", () => {
    const v = visibleRows(ROWS, new Set(["address"]), "");

    expect(v.map((x) => x.depth)).toEqual([0, 1, 1, 0, 0, 0]);
    expect(v.map((x) => x.hasChildren)).toEqual([true, false, true, false, false, false]);
    expect(v.map((x) => x.expanded)).toEqual([true, false, false, false, false, false]);
  });

  it("keeps a row whose parent is not in the list, as a root", () => {
    const v = visibleRows(ROWS, new Set(), "");

    expect(v.map((x) => x.row.id)).toContain("orphan");
    expect(v.find((x) => x.row.id === "orphan")?.depth).toBe(0);
  });

  it("shows a deep match with its ancestors and nothing else, expanded", () => {
    expect(visibleRows(ROWS, new Set(), "LAT").map((v) => [v.row.id, v.expanded])).toEqual([
      ["address", true],
      ["geo", true],
      ["lat", false],
    ]);
  });

  it("shows a matching container with only its matching descendants", () => {
    expect(ids([], "ge")).toEqual(["address", "geo"]);
  });

  it("ignores blanks around the query", () => {
    expect(ids([], "  name ")).toEqual(["name"]);
  });

  it("counts a group for no level, names it on the rows under it, and places each row among its siblings", () => {
    const rows = [...ROWS, row("nis", null, "group"), row("ghost", "nis")];
    const v = visibleRows(rows, new Set(["address", "geo"]), "");
    const at = (id: string) => v.find((x) => x.row.id === id)!;

    expect([at("ghost").level, at("ghost").groupId]).toEqual([1, "nis"]);
    expect([at("lat").level, at("lat").groupId]).toEqual([3, null]);
    expect([at("street").index, at("street").siblingCount]).toEqual([1, 2]);
    // Roots: address, name, tags and the orphan; the group heading is not counted.
    expect([at("name").index, at("name").siblingCount]).toEqual([2, 4]);
    expect([at("ghost").index, at("ghost").siblingCount]).toEqual([1, 1]);
  });

  it("reports no children under a query: there is nothing to toggle", () => {
    const v = visibleRows(ROWS, new Set(), "lat");

    expect(v.map((x) => x.hasChildren)).toEqual([false, false, false]);
    expect(v.map((x) => [x.row.id, x.index, x.siblingCount])).toEqual([["address", 1, 1], ["geo", 1, 1], ["lat", 1, 1]]);
  });

  it("always shows a group's children and gives the group no children of its own", () => {
    const rows = [...ROWS, row("nis", null, "group"), row("ghost", "nis")];
    const v = visibleRows(rows, new Set(), "");

    expect(v.map((x) => x.row.id)).toContain("ghost");
    expect(v.find((x) => x.row.id === "nis")?.hasChildren).toBe(false);
    expect(containerIds(rows).has("nis")).toBe(false);
  });
});

describe("containerIds", () => {
  it("names every row that has children", () => {
    expect([...containerIds(ROWS)].sort()).toEqual(["address", "geo"]);
  });
});
