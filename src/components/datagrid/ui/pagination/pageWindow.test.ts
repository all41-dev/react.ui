import { describe, expect, it } from "vitest";

import { pageWindow } from "./pageWindow";

describe("pageWindow", () => {
  it("renders every page when the total fits", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("renders nothing for zero pages", () => {
    expect(pageWindow(1, 0)).toEqual([]);
  });

  it("windows a middle page between two ellipses", () => {
    expect(pageWindow(5, 20)).toEqual([1, "ellipsis-l", 4, 5, 6, "ellipsis-r", 20]);
    expect(pageWindow(10, 20)).toEqual([1, "ellipsis-l", 9, 10, 11, "ellipsis-r", 20]);
  });

  it("drops the left ellipsis when the window touches the start", () => {
    expect(pageWindow(1, 8)).toEqual([1, 2, "ellipsis-r", 8]);
    expect(pageWindow(3, 8)).toEqual([1, 2, 3, 4, "ellipsis-r", 8]);
  });

  it("drops the right ellipsis when the window touches the end", () => {
    expect(pageWindow(8, 8)).toEqual([1, "ellipsis-l", 7, 8]);
    expect(pageWindow(6, 8)).toEqual([1, "ellipsis-l", 5, 6, 7, 8]);
  });

  it("keeps the two ellipsis markers distinct — both render as React keys", () => {
    const markers = pageWindow(10, 40).filter((p) => typeof p === "string");
    expect(markers).toEqual(["ellipsis-l", "ellipsis-r"]);
  });
});
