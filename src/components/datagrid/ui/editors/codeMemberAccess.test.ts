import { describe, expect, it } from "vitest";
import { parseMemberAccess } from "./codeMemberAccess";

describe("parseMemberAccess", () => {
  const at = (text: string) => {
    const { path, word } = parseMemberAccess(text, text.length);
    return { path, word };
  };

  it("splits a partial word from its resolved prefix", () => {
    expect(at("context.obj.ci")).toEqual({ path: ["context", "obj"], word: "ci" });
  });

  it("treats a trailing dot as a complete path with no word", () => {
    expect(at("context.obj.")).toEqual({ path: ["context", "obj"], word: "" });
  });

  it("walks arbitrarily deep for nested objects", () => {
    expect(at("context.obj.address.geo.")).toEqual({
      path: ["context", "obj", "address", "geo"],
      word: "",
    });
  });

  it("returns a bare word with an empty path", () => {
    expect(at("cont")).toEqual({ path: [], word: "cont" });
  });

  it("reads only the chain touching the cursor", () => {
    expect(at("![1, 2].includes(context.obj.ma1_")).toEqual({
      path: ["context", "obj"],
      word: "ma1_",
    });
  });

  it("stops at a non-identifier boundary", () => {
    expect(at("a + ")).toEqual({ path: [], word: "" });
  });

  /*
   * Source-system columns are not always valid identifiers, so bracket notation is the
   * only way to reach them and has to resolve like a dot.
   */
  it("reads a bracketed segment as part of the path", () => {
    expect(at('context.obj["qwe qwe qwe"].')).toEqual({
      path: ["context", "obj", "qwe qwe qwe"],
      word: "",
    });
  });

  it("captures a partial bracket string, spaces included", () => {
    expect(at('context.obj["qwe qw')).toEqual({
      path: ["context", "obj"],
      word: "qwe qw",
    });
  });

  it("treats a bare opening bracket as an empty word", () => {
    expect(at("context.obj[")).toEqual({ path: ["context", "obj"], word: "" });
  });

  it("chains bracket segments without a separator", () => {
    expect(at('context.obj["a b"]["c d"].')).toEqual({
      path: ["context", "obj", "a b", "c d"],
      word: "",
    });
  });

  it("handles single quotes and escaped quotes", () => {
    expect(at("context.obj['a b'].")).toEqual({
      path: ["context", "obj", "a b"],
      word: "",
    });
    expect(at('context.obj["a\\"b"].')).toEqual({
      path: ["context", "obj", 'a"b'],
      word: "",
    });
  });

  it("does not mistake a closed bracket string for an open one", () => {
    expect(at('context.obj["a b"].ci')).toEqual({
      path: ["context", "obj", "a b"],
      word: "ci",
    });
  });

  it("reports the access kind and the range to replace", () => {
    const dot = parseMemberAccess("context.obj.ci", 14);
    expect(dot).toMatchObject({ access: "dot", from: 12, to: 14 });

    const bracket = parseMemberAccess('context.obj["qw', 15);
    expect(bracket).toMatchObject({ access: "bracket", quote: '"', from: 13, to: 15 });

    const empty = parseMemberAccess("context.obj[", 12);
    expect(empty).toMatchObject({ access: "bracket", from: 12, to: 12 });
    expect(empty.quote).toBeUndefined();
  });

  it("reads the text before the cursor, not the whole document", () => {
    const text = "context.obj.city && other.stuff";
    const { path, word } = parseMemberAccess(text, "context.obj.ci".length);
    expect({ path, word }).toEqual({ path: ["context", "obj"], word: "ci" });
  });
});
