import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useAnchoredPanel } from "./useAnchoredPanel";

/*
 * jsdom does no layout, so these tests drive the hook with hand-built trigger rects and
 * viewport sizes and assert the style it computes. The constants mirror the hook's:
 * GAP 6 (trigger→panel) + MARGIN 8 (panel→window edge) — the clamp always subtracts 14.
 */

const setViewport = (w: number, h: number) => {
  Object.defineProperty(window, "innerWidth", { value: w, writable: true, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: h, writable: true, configurable: true });
};

/** An anchor whose rect can be mutated between events to simulate scrolling. */
const makeAnchor = (rect: { top: number; bottom: number; right: number }) => {
  const el = {
    getBoundingClientRect: () =>
      ({ left: rect.right - 30, width: 30, height: rect.bottom - rect.top, x: 0, y: 0, ...rect }) as DOMRect,
  } as unknown as HTMLElement;
  return { ref: { current: el }, rect };
};

afterEach(() => setViewport(1024, 768));

describe("useAnchoredPanel", () => {
  it("stays hidden until it has been measured", () => {
    const { ref } = makeAnchor({ top: 100, bottom: 130, right: 900 });
    const { result } = renderHook(() => useAnchoredPanel(false, ref, 236, 300));
    // A bare `position: static` before the first placement would drop the panel into
    // the toolbar's flow for one frame.
    expect(result.current).toEqual({ position: "fixed", visibility: "hidden" });
  });

  it("hangs below the trigger, right-aligned, clamped to the room below", () => {
    setViewport(1024, 768);
    const { ref } = makeAnchor({ top: 100, bottom: 130, right: 900 });
    const { result } = renderHook(() => useAnchoredPanel(true, ref, 236, 300));

    expect(result.current).toEqual({
      position: "fixed",
      left: 900 - 236,
      top: 130 + 6,
      // Room below is 768 − 130 = 638; the clamp keeps GAP + MARGIN of it.
      maxHeight: 638 - 14,
    });
  });

  it("flips up when the room above beats the room below", () => {
    setViewport(1024, 400);
    const { ref } = makeAnchor({ top: 340, bottom: 366, right: 900 });
    const { result } = renderHook(() => useAnchoredPanel(true, ref, 236, 300));

    // below = 34 < estHeight and above (340) > below → open upward, anchored by `bottom`.
    expect(result.current).toEqual({
      position: "fixed",
      left: 900 - 236,
      bottom: 400 - 340 + 6,
      maxHeight: 340 - 14,
    });
  });

  it("still drops down when neither side fits but below has more room", () => {
    // The review's worked example: innerHeight 400, trigger at top 174 / bottom 200.
    // Dropping down is the lesser evil — and the clamp is what makes it survivable,
    // turning "cut off below the fold" into "scrolls internally".
    setViewport(1024, 400);
    const { ref } = makeAnchor({ top: 174, bottom: 200, right: 900 });
    const { result } = renderHook(() => useAnchoredPanel(true, ref, 236, 300));

    expect(result.current).toMatchObject({ top: 206, maxHeight: 200 - 14 });
    expect(result.current.bottom).toBeUndefined();
  });

  it("floors the clamp at zero rather than going negative", () => {
    // Trigger sits at the very bottom edge: below = 5, above = 2 — no side has room.
    setViewport(1024, 200);
    const { ref } = makeAnchor({ top: 2, bottom: 195, right: 900 });
    const { result } = renderHook(() => useAnchoredPanel(true, ref, 236, 300));

    expect(result.current.maxHeight).toBe(0);
  });

  it("keeps the panel inside the viewport horizontally on both sides", () => {
    setViewport(1024, 768);
    // Trigger hangs off the left edge: right-aligning would push the panel to −136.
    const left = renderHook(() =>
      useAnchoredPanel(true, makeAnchor({ top: 100, bottom: 130, right: 100 }).ref, 236, 300)
    );
    expect(left.result.current.left).toBe(8);

    // Trigger reports a rect past the right edge: cap to width − panel − margin.
    const right = renderHook(() =>
      useAnchoredPanel(true, makeAnchor({ top: 100, bottom: 130, right: 2000 }).ref, 236, 300)
    );
    expect(right.result.current.left).toBe(1024 - 236 - 8);
  });

  it("follows the trigger when a scroll moves it", () => {
    setViewport(1024, 768);
    const { ref, rect } = makeAnchor({ top: 100, bottom: 130, right: 900 });
    const { result } = renderHook(() => useAnchoredPanel(true, ref, 236, 300));
    expect(result.current.top).toBe(136);

    rect.top = 50;
    rect.bottom = 80;
    // Capture-phase on window, so a scroll of any inner container repositions it too.
    act(() => window.dispatchEvent(new Event("scroll")));

    expect(result.current.top).toBe(86);
    expect(result.current.maxHeight).toBe(768 - 80 - 14);
  });

  it("re-clamps when the window is resized", () => {
    setViewport(1024, 768);
    const { ref } = makeAnchor({ top: 100, bottom: 130, right: 900 });
    const { result } = renderHook(() => useAnchoredPanel(true, ref, 236, 300));
    expect(result.current.maxHeight).toBe(768 - 130 - 14);

    setViewport(1024, 400);
    act(() => window.dispatchEvent(new Event("resize")));

    expect(result.current.maxHeight).toBe(400 - 130 - 14);
  });

  it("keeps the same style object across a scroll that moved nothing", () => {
    // `place` runs per capture-phase scroll event; a fresh object each time would
    // re-render the open panel once per event for no visual change.
    setViewport(1024, 768);
    const { ref } = makeAnchor({ top: 100, bottom: 130, right: 900 });
    const { result } = renderHook(() => useAnchoredPanel(true, ref, 236, 300));
    const before = result.current;

    act(() => window.dispatchEvent(new Event("scroll")));

    expect(result.current).toBe(before);
  });

  it("stops tracking once closed", () => {
    setViewport(1024, 768);
    const { ref, rect } = makeAnchor({ top: 100, bottom: 130, right: 900 });
    const { result, rerender } = renderHook(
      ({ open }) => useAnchoredPanel(open, ref, 236, 300),
      { initialProps: { open: true } }
    );
    const placed = result.current;

    rerender({ open: false });
    rect.top = 50;
    rect.bottom = 80;
    act(() => window.dispatchEvent(new Event("scroll")));

    // The listeners are gone with the panel; the stale style is never recomputed.
    expect(result.current).toBe(placed);
  });
});
