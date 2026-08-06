import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { useConfirm } from "./useConfirm";

/**
 * The valuable property here is that the promise ALWAYS settles. A prompt that hangs
 * leaves its caller awaiting forever — and `handleDelete` awaits this before doing
 * anything, so a hung prompt silently disables deletion.
 */
describe("useConfirm", () => {
  it("resolves true on confirm", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useConfirm());

    let settled: boolean | undefined;
    act(() => {
      void result.current.confirm("Delete this?").then((v) => (settled = v));
    });
    render(<>{result.current.ConfirmDialog}</>);

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(settled).toBe(true);
  });

  it("resolves false on cancel", async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() => useConfirm());

    let settled: boolean | undefined;
    act(() => {
      void result.current.confirm("Delete this?").then((v) => (settled = v));
    });
    render(<>{result.current.ConfirmDialog}</>);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(settled).toBe(false);
  });

  it("settles a superseded prompt instead of leaving it hanging", async () => {
    const { result } = renderHook(() => useConfirm());

    let first: boolean | undefined;
    let second: boolean | undefined;
    await act(async () => {
      void result.current.confirm("First").then((v) => (first = v));
      void result.current.confirm("Second").then((v) => (second = v));
    });

    // The first resolver was replaced; it must resolve rather than never settle.
    expect(first).toBe(false);
    expect(second).toBeUndefined();
  });

  it("settles on unmount", async () => {
    const { result, unmount } = renderHook(() => useConfirm());

    let settled: boolean | undefined;
    act(() => {
      void result.current.confirm("Delete this?").then((v) => (settled = v));
    });
    await act(async () => {
      unmount();
    });
    expect(settled).toBe(false);
  });

  describe("dialog semantics (A5)", () => {
    it("puts the role, aria-modal and name on the PANEL, not the scrim", async () => {
      const { result } = renderHook(() => useConfirm());
      act(() => {
        void result.current.confirm({
          title: "Delete this item?",
          description: "This action cannot be undone.",
        });
      });
      render(<>{result.current.ConfirmDialog}</>);

      // `alertdialog`, and named by its own heading — it used to be an unnamed
      // `role="dialog"` sitting on the full-viewport backdrop.
      const dialog = screen.getByRole("alertdialog", {
        name: "Delete this item?",
      });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAccessibleDescription("This action cannot be undone.");
      // The scrim is the parent, and must not itself claim to be the dialog.
      expect(dialog.parentElement).not.toHaveAttribute("role");
    });

    it("closes on Escape", async () => {
      const user = userEvent.setup();
      const { result } = renderHook(() => useConfirm());

      let settled: boolean | undefined;
      act(() => {
        void result.current.confirm("Delete this?").then((v) => (settled = v));
      });
      render(<>{result.current.ConfirmDialog}</>);

      await user.keyboard("{Escape}");
      expect(settled).toBe(false);
    });
  });
});
