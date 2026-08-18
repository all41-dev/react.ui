import { describe, expect, it } from "vitest";

import { TOOLS, opFor } from "./markdownTools";

describe("wrap-style tools", () => {
  it("bold wraps the selection and re-selects the wrapped text", () => {
    expect(opFor("bold")("hi", 0, 2)).toEqual({
      next: "**hi**",
      selStart: 2,
      selEnd: 4,
    });
  });

  it("substitutes a placeholder when nothing is selected", () => {
    expect(opFor("bold")("", 0, 0)).toEqual({
      next: "**text**",
      selStart: 2,
      selEnd: 6,
    });
  });

  it("wraps mid-string without disturbing the surroundings", () => {
    expect(opFor("italic")("a bc d", 2, 4)).toEqual({
      next: "a *bc* d",
      selStart: 3,
      selEnd: 5,
    });
  });

  it("code wraps in backticks", () => {
    expect(opFor("code")("x", 0, 1).next).toBe("`x`");
  });

  it("link produces [label](url) and selects the label", () => {
    expect(opFor("link")("docs", 0, 4)).toEqual({
      next: "[docs](url)",
      selStart: 1,
      selEnd: 5,
    });
  });
});

describe("line-prefix tools", () => {
  it("heading prefixes the whole line even from a mid-line cursor", () => {
    expect(opFor("heading")("one\ntwo\nthree", 5, 5).next).toBe(
      "one\n## two\nthree"
    );
  });

  it("bullet prefixes every line the selection touches", () => {
    expect(opFor("bullet")("a\nb", 0, 3).next).toBe("- a\n- b");
  });

  it("numbered numbers the lines from 1", () => {
    expect(opFor("numbered")("a\nb\nc", 0, 5).next).toBe("1. a\n2. b\n3. c");
  });

  it("quote prefixes with >", () => {
    expect(opFor("quote")("a", 0, 1).next).toBe("> a");
  });

  it("expands to whole-line boundaries and re-selects the block", () => {
    const r = opFor("bullet")("head\nmid\ntail", 6, 7);
    expect(r.next).toBe("head\n- mid\ntail");
    expect(r.next.slice(r.selStart, r.selEnd)).toBe("- mid");
  });

  it("handles the last line when the text has no trailing newline", () => {
    expect(opFor("bullet")("a\nb", 2, 3).next).toBe("a\n- b");
  });
});

it("every toolbar tool resolves to an op", () => {
  for (const { action } of TOOLS) {
    expect(opFor(action)).toBeTypeOf("function");
  }
});
