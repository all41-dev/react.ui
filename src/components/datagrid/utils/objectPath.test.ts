import { describe, expect, it } from "vitest";

import { getPath, setPath } from "./objectPath";

describe("getPath", () => {
  it("reads a flat key", () => {
    expect(getPath({ name: "Leanne" }, "name")).toBe("Leanne");
  });

  it("reads a nested key", () => {
    expect(getPath({ user: { name: "Leanne" } }, "user.name")).toBe("Leanne");
  });

  it("returns undefined rather than throwing on a missing level", () => {
    expect(getPath({}, "user.name")).toBeUndefined();
    expect(getPath(undefined, "user.name")).toBeUndefined();
    expect(getPath({ user: null }, "user.name")).toBeUndefined();
  });

  it("reads through an array index", () => {
    expect(getPath({ tags: ["a", "b"] }, "tags.1")).toBe("b");
  });
});

describe("setPath", () => {
  it("writes a flat key", () => {
    const t: Record<string, unknown> = {};
    setPath(t, "name", "Leanne");
    expect(t).toEqual({ name: "Leanne" });
  });

  it("creates missing object levels", () => {
    const t: Record<string, unknown> = {};
    setPath(t, "user.name", "Leanne");
    expect(t).toEqual({ user: { name: "Leanne" } });
  });

  /* The target is a shallow copy of a row; writing through would mutate the nested
     objects it still shares with it. */
  it("copies an existing level instead of mutating it", () => {
    const shared = { name: "Leanne", email: "l@example.com" };
    const t: Record<string, unknown> = { user: shared };
    setPath(t, "user.name", "Ervin");
    expect(shared.name).toBe("Leanne");
    expect(t.user).toEqual({ name: "Ervin", email: "l@example.com" });
  });

  /* A plain object here would seed the form `{ tags: { 0: … } }`, which a schema
     expecting an array rejects on submit. */
  it("creates an array level for an all-digit segment", () => {
    const t: Record<string, unknown> = {};
    setPath(t, "tags.0", "red");
    expect(Array.isArray(t.tags)).toBe(true);
    expect(t.tags).toEqual(["red"]);
  });

  it("keeps an existing array an array", () => {
    const t: Record<string, unknown> = { tags: ["red", "blue"] };
    setPath(t, "tags.1", "green");
    expect(t.tags).toEqual(["red", "green"]);
  });
});

describe("getPath on shapes that do not match the key", () => {
  it("stops at a level that is not an object", () => {
    expect(getPath({ user: "Leanne" }, "user.name")).toBeUndefined();
  });

  it("survives a null or undefined source on a flat key", () => {
    expect(getPath(undefined, "name")).toBeUndefined();
    expect(getPath(null, "name")).toBeUndefined();
  });
});

describe("setPath on shapes that do not match the key", () => {
  it("replaces a non-object level rather than throwing", () => {
    const t: Record<string, unknown> = { user: "Leanne" };
    setPath(t, "user.name", "Ervin");
    expect(t).toEqual({ user: { name: "Ervin" } });
  });

  /* Same reason as the object case: the row still owns the array this was copied from. */
  it("copies an existing array instead of mutating it", () => {
    const shared = ["red", "blue"];
    const t: Record<string, unknown> = { tags: shared };
    setPath(t, "tags.1", "green");
    expect(shared).toEqual(["red", "blue"]);
    expect(t.tags).not.toBe(shared);
  });

  it("builds an object inside an array level", () => {
    const t: Record<string, unknown> = {};
    setPath(t, "items.0.label", "first");
    expect(t).toEqual({ items: [{ label: "first" }] });
  });
});
