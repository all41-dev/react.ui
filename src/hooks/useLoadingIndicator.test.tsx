import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { useLoadingIndicator } from "./useLoadingIndicator";
import { LoadingClockContext, type LoadingClock } from "./loadingClock";
import { DelayedRender } from "../components/DelayedRender";

/*
 * The hook is what keeps every loading state from flashing: nothing inside the
 * delay, and once shown, nothing shorter than the minimum.
 */

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

  it("takes its delay and minimum from the options", () => {
    const { result, rerender } = renderHook(
      ({ loading }) =>
        useLoadingIndicator(loading, { delayMs: 100, minVisibleMs: 0 }),
      { initialProps: { loading: true } }
    );

    advance(100);
    expect(result.current).toBe(true);
    rerender({ loading: false });
    advance(0);
    expect(result.current).toBe(false);
  });
});

describe("useLoadingIndicator under a shared clock", () => {
  const clockAt = (since: number, settled: boolean): LoadingClock => ({ since, settled: () => settled });

  const withClock =
    (clock: LoadingClock) =>
    ({ children }: { children: React.ReactNode }) => (
      <LoadingClockContext value={clock}>{children}</LoadingClockContext>
    );

  it("counts from the clock while it is not settled", () => {
    // The shared wait started 200 ms ago; the component mounts now, already loading.
    const clock = clockAt(Date.now() - 200, false);
    const { result } = renderHook(() => useLoadingIndicator(true), {
      wrapper: withClock(clock),
    });

    advance(50);
    expect(result.current).toBe(true);
  });

  it("counts from its own start once the clock is settled", () => {
    const clock = clockAt(Date.now() - 5_000, true);
    const { result } = renderHook(() => useLoadingIndicator(true), {
      wrapper: withClock(clock),
    });

    advance(249);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });

  it("counts a wait that starts later from its own start, whatever the clock", () => {
    const clock = clockAt(Date.now() - 5_000, false);
    const { result, rerender } = renderHook(
      ({ loading }) => useLoadingIndicator(loading),
      { initialProps: { loading: false }, wrapper: withClock(clock) }
    );

    rerender({ loading: true });
    advance(249);
    expect(result.current).toBe(false);
    advance(1);
    expect(result.current).toBe(true);
  });
});

describe("DelayedRender", () => {
  it("withholds its children for the delay", () => {
    render(
      <DelayedRender>
        <p>Loading…</p>
      </DelayedRender>
    );

    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    advance(250);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
