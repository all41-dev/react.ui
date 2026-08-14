import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useColumnDefWarnings } from "./useColumnDefWarnings";

/**
 * Both failures are silent in production — a column that renders in the wrong place, or
 * a whole column model rebuilt every render — so the warning is the only thing that
 * surfaces them.
 */

const warnSpy = () => vi.spyOn(console, "warn").mockImplementation(() => {});
const said = (spy: ReturnType<typeof warnSpy>, needle: RegExp) =>
  spy.mock.calls.some((c) => needle.test(String(c[0])));

describe("useColumnDefWarnings", () => {
  it("says nothing about a well-formed column list", () => {
    const warn = warnSpy();
    const cols: unknown[] = [];
    renderHook(() => useColumnDefWarnings(cols, ["name", "role"]));
    expect(warn).not.toHaveBeenCalled();
  });

  it("names a column that resolves to no id", () => {
    const warn = warnSpy();
    const cols: unknown[] = [];
    renderHook(() => useColumnDefWarnings(cols, ["name", ""]));
    expect(said(warn, /resolves to no id/)).toBe(true);
  });

  /* Two columns under one id means only the last reaches the table — the other simply
     disappears, and the one that survives is handed to TanStack twice. */
  it("reports duplicate ids, and which ones", () => {
    const warn = warnSpy();
    const cols: unknown[] = [];
    renderHook(() => useColumnDefWarnings(cols, ["name", "role", "name"]));
    expect(said(warn, /Duplicate column ids: name/)).toBe(true);
  });

  it("warns when the columns array churns on nearly every render", () => {
    const warn = warnSpy();
    const ids = ["name"];
    const { rerender } = renderHook(
      ({ cols }: { cols: unknown[] }) => useColumnDefWarnings(cols, ids),
      { initialProps: { cols: [] as unknown[] } }
    );

    // A fresh array every time, the id list unchanged — the signature of a `columns`
    // prop built inline in the consumer's render.
    for (let i = 0; i < 25; i += 1) rerender({ cols: [] });
    expect(said(warn, /new array on nearly every render/)).toBe(true);
  });

  it("stays quiet while the array identity holds", () => {
    const warn = warnSpy();
    const cols: unknown[] = [];
    const { rerender } = renderHook(() => useColumnDefWarnings(cols, ["name"]));
    for (let i = 0; i < 25; i += 1) rerender();
    expect(said(warn, /new array on nearly every render/)).toBe(false);
  });
});
