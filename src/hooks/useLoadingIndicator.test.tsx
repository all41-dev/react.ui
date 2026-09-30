import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLoadingIndicator } from "./useLoadingIndicator";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("useLoadingIndicator", () => {
  it("shows nothing inside the delay and the indicator after it", () => {
    const { result } = renderHook(() => useLoadingIndicator(true));

    expect(result.current).toBe(false);
    advance(249);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });

  it("never shows for a wait that ends inside the delay", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useLoadingIndicator(loading),
      { initialProps: { loading: true } }
    );

    advance(200);
    rerender({ loading: false });
    advance(1_000);
    expect(result.current).toBe(false);
  });

  it("keeps a shown indicator for the minimum once the wait ends", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useLoadingIndicator(loading),
      { initialProps: { loading: true } }
    );

    advance(250);
    expect(result.current).toBe(true);
    advance(100);
    rerender({ loading: false });
    advance(299);
    expect(result.current).toBe(true);
    advance(1);
    expect(result.current).toBe(false);
  });

  it("hides at once when the wait ends after the minimum", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useLoadingIndicator(loading),
      { initialProps: { loading: true } }
    );

    advance(1_000);
    rerender({ loading: false });
    advance(0);
    expect(result.current).toBe(false);
  });

  it("counts a second wait from its own start", () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useLoadingIndicator(loading),
      { initialProps: { loading: true } }
    );

    advance(1_000);
    rerender({ loading: false });
    advance(1_000);
    rerender({ loading: true });
    advance(249);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });

  it("takes its delay and minimum from the options", () => {
    const { result, rerender } = renderHook(
      ({ loading }) =>
        useLoadingIndicator(loading, { delayMs: 0, minVisibleMs: 0 }),
      { initialProps: { loading: true } }
    );

    advance(0);
    expect(result.current).toBe(true);
    rerender({ loading: false });
    advance(0);
    expect(result.current).toBe(false);
  });
});
