import { beforeEach, describe, expect, it } from "vitest";
import { readSplitRatios, readSplitSizes, writeSplitRatios, writeSplitSizes } from "./splitRatio";

const KEY = "ratios-test";
const DEFAULTS = { a: 0.2, b: 0.7 };

beforeEach(() => localStorage.clear());

describe("the shares of a split in order", () => {
  it("reads the fallback with nothing stored or no key, and the stored list over it", () => {
    expect(readSplitSizes(KEY, [0.5, 0.5])).toEqual([0.5, 0.5]);
    writeSplitSizes(KEY, [0.3, 0.7]);
    expect(readSplitSizes(KEY, [0.5, 0.5])).toEqual([0.3, 0.7]);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ v: 1, sizes: [0.3, 0.7] });
    expect(readSplitSizes(undefined, [0.4, 0.6])).toEqual([0.4, 0.6]);
  });

  it("forgets the list on null", () => {
    writeSplitSizes(KEY, [0.3, 0.7]);
    writeSplitSizes(KEY, null);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("ignores another version, another length and a share out of range", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 2, sizes: [0.3, 0.7] }));
    expect(readSplitSizes(KEY, [0.5, 0.5])).toEqual([0.5, 0.5]);
    localStorage.setItem(KEY, JSON.stringify({ v: 1, sizes: [0.3, 0.3, 0.4] }));
    expect(readSplitSizes(KEY, [0.5, 0.5])).toEqual([0.5, 0.5]);
    localStorage.setItem(KEY, JSON.stringify({ v: 1, sizes: [4, 0.5] }));
    expect(readSplitSizes(KEY, [0.5, 0.5])).toEqual([0.5, 0.5]);
    localStorage.setItem(KEY, "nonsense");
    expect(readSplitSizes(KEY, [0.5, 0.5])).toEqual([0.5, 0.5]);
  });
});

describe("named shares under one key", () => {
  it("reads the defaults with nothing stored, and the stored shares over them", () => {
    expect(readSplitRatios(KEY, DEFAULTS)).toEqual(DEFAULTS);
    writeSplitRatios(KEY, { a: 0.4 });
    expect(readSplitRatios(KEY, DEFAULTS)).toEqual({ a: 0.4, b: 0.7 });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ v: 1, ratios: { a: 0.4 } });
  });

  it("drops a forgotten share and removes the key once none is left", () => {
    writeSplitRatios(KEY, { a: 0.4, b: 0.1 });
    writeSplitRatios(KEY, { a: null, b: 0.1 });
    expect(readSplitRatios(KEY, DEFAULTS)).toEqual({ a: 0.2, b: 0.1 });
    writeSplitRatios(KEY, { a: null, b: null });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("ignores another version, a malformed value and a share out of range", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 2, ratios: { a: 0.4 } }));
    expect(readSplitRatios(KEY, DEFAULTS)).toEqual(DEFAULTS);
    localStorage.setItem(KEY, "nonsense");
    expect(readSplitRatios(KEY, DEFAULTS)).toEqual(DEFAULTS);
    localStorage.setItem(KEY, JSON.stringify({ v: 1, ratios: { a: 3, b: "x" } }));
    expect(readSplitRatios(KEY, DEFAULTS)).toEqual(DEFAULTS);
  });
});
