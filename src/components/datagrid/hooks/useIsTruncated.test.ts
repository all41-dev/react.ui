import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useIsTruncated } from "./useIsTruncated";

const el = (scrollWidth: number, clientWidth: number) =>
  ({ scrollWidth, clientWidth }) as HTMLElement;

describe("useIsTruncated", () => {
  it("reports clipping when the content overflows", () => {
    const { result } = renderHook(() => useIsTruncated());
    result.current.ref.current = el(300, 100);
    act(() => result.current.measure());
    expect(result.current.truncated).toBe(true);
  });

  it("absorbs sub-pixel rounding: 1px over an exact fit is not clipped", () => {
    const { result } = renderHook(() => useIsTruncated());
    result.current.ref.current = el(101, 100);
    act(() => result.current.measure());
    expect(result.current.truncated).toBe(false);

    result.current.ref.current = el(102, 100);
    act(() => result.current.measure());
    expect(result.current.truncated).toBe(true);
  });

  it("is a no-op before the ref is attached", () => {
    const { result } = renderHook(() => useIsTruncated());
    act(() => result.current.measure());
    expect(result.current.truncated).toBe(false);
  });
});
