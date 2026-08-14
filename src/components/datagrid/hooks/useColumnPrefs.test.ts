import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useColumnPrefs } from "./useColumnPrefs";

const IDS = ["__select__", "name", "email", "__actions__"];

describe("useColumnPrefs", () => {
  beforeEach(() => localStorage.clear());

  it("starts from the column defaults when nothing is stored", () => {
    const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
    expect(result.current.state.columnOrder).toEqual(IDS);
    expect(result.current.state.columnVisibility).toEqual({});
    expect(result.current.state.columnSizing).toEqual({});
  });

  /*
   * Persisting an untouched grid pins its column order forever: `normalizeOrder` appends
   * ids the store has never seen, so a column added between two existing ones in a later
   * release would land at the end of the table for everyone who ever opened it.
   */
  it("writes nothing until the user changes something", async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(localStorage.getItem("dg:a")).toBeNull();

      act(() => result.current.handlers.onColumnVisibilityChange({ email: false }));
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(localStorage.getItem("dg:a")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides a forced-hidden column over the user's own choice", () => {
    localStorage.setItem(
      "dg:a",
      JSON.stringify({ v: 1, columnVisibility: { email: true } })
    );
    const { result } = renderHook(() =>
      useColumnPrefs("dg:a", IDS, undefined, ["email"])
    );
    expect(result.current.state.columnVisibility.email).toBe(false);
  });

  it("discards a stored blob from an older shape rather than merging it", () => {
    // Merging half-migrated preferences produces layouts nobody chose.
    localStorage.setItem(
      "dg:a",
      JSON.stringify({ v: 0, columnOrder: ["email", "name"] })
    );
    const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
    expect(result.current.state.columnOrder).toEqual(IDS);
  });

  it("survives malformed JSON", () => {
    localStorage.setItem("dg:a", "{ not json");
    const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
    expect(result.current.state.columnOrder).toEqual(IDS);
  });

  describe("order normalization", () => {
    it("drops stored ids that no longer exist", () => {
      localStorage.setItem(
        "dg:a",
        JSON.stringify({ v: 1, columnOrder: ["email", "gone", "name"] })
      );
      const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
      expect(result.current.state.columnOrder).not.toContain("gone");
    });

    it("appends columns the stored order never knew about", () => {
      localStorage.setItem(
        "dg:a",
        JSON.stringify({ v: 1, columnOrder: ["email", "name"] })
      );
      const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
      expect(result.current.state.columnOrder).toEqual([
        "email",
        "name",
        "__select__",
        "__actions__",
      ]);
    });

    it("never loses or duplicates a column", () => {
      localStorage.setItem(
        "dg:a",
        JSON.stringify({ v: 1, columnOrder: ["email", "gone"] })
      );
      const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
      const order = result.current.state.columnOrder;
      expect(new Set(order).size).toBe(order.length);
      expect([...order].sort()).toEqual([...IDS].sort());
    });
  });

  it("loads the new grid's own prefs when storageKey changes", () => {
    // Carrying the previous grid's layout across a key swap was the bug here.
    localStorage.setItem(
      "dg:b",
      JSON.stringify({ v: 1, columnOrder: ["email", "name"], columnVisibility: { name: false } })
    );
    const { result, rerender } = renderHook(
      ({ key }) => useColumnPrefs(key, IDS),
      { initialProps: { key: "dg:a" } }
    );
    expect(result.current.state.columnVisibility).toEqual({});

    rerender({ key: "dg:b" });
    expect(result.current.state.columnVisibility).toEqual({ name: false });
    expect(result.current.state.columnOrder[0]).toBe("email");
  });

  describe("default-hidden columns", () => {
    it("starts them hidden", () => {
      const { result } = renderHook(() => useColumnPrefs("dg:a", IDS, ["email"]));
      expect(result.current.state.columnVisibility).toEqual({ email: false });
    });

    it("lets a stored preference win, so revealing one survives a reload", () => {
      localStorage.setItem(
        "dg:a",
        JSON.stringify({ v: 1, columnVisibility: { email: true } })
      );
      const { result } = renderHook(() => useColumnPrefs("dg:a", IDS, ["email"]));
      expect(result.current.state.columnVisibility).toEqual({ email: true });
    });

    it("never writes the seed to storage", async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useColumnPrefs("dg:a", IDS, ["email"]));
      act(() => result.current.handlers.onColumnSizingChange({ name: 200 }));
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      const stored = JSON.parse(localStorage.getItem("dg:a") ?? "{}");
      expect(stored.columnVisibility).toEqual({});
      vi.useRealTimers();
    });

    it("reset returns them to hidden", () => {
      const { result } = renderHook(() => useColumnPrefs("dg:a", IDS, ["email"]));
      act(() => result.current.handlers.onColumnVisibilityChange({ email: true }));
      expect(result.current.state.columnVisibility).toEqual({ email: true });

      act(() => result.current.reset());
      expect(result.current.state.columnVisibility).toEqual({ email: false });
    });
  });

  it("persists changes under the storage key", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
    act(() => result.current.handlers.onColumnVisibilityChange({ email: false }));
    // The write is debounced so a column drag writes once at rest.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    const stored = JSON.parse(localStorage.getItem("dg:a") ?? "{}");
    expect(stored.columnVisibility).toEqual({ email: false });
    vi.useRealTimers();
  });

  it("accepts updater functions as well as values", () => {
    const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
    act(() => result.current.handlers.onColumnSizingChange({ name: 200 }));
    expect(result.current.state.columnSizing).toEqual({ name: 200 });
    act(() =>
      result.current.handlers.onColumnSizingChange(
        (prev: Record<string, number>) => ({ ...prev, email: 120 })
      )
    );
    expect(result.current.state.columnSizing).toEqual({ name: 200, email: 120 });
  });

  it("reset clears everything back to the defaults", () => {
    // Without this a user could persist a broken layout with no way out.
    const { result } = renderHook(() => useColumnPrefs("dg:a", IDS));
    act(() => {
      result.current.handlers.onColumnVisibilityChange({ email: false });
      result.current.handlers.onColumnOrderChange(["email", "name"]);
    });
    expect(result.current.state.columnVisibility).toEqual({ email: false });

    act(() => result.current.reset());
    expect(result.current.state.columnVisibility).toEqual({});
    expect(result.current.state.columnOrder).toEqual(IDS);
  });
});
