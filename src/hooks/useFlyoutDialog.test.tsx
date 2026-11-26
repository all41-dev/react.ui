import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useFlyoutDialog } from "./useFlyoutDialog";

function Harness({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { slotRef, panelRef, onKeyDown } = useFlyoutDialog(isOpen, onClose);
  return (
    <div>
      <button type="button" data-testid="outside">
        outside
      </button>
      {/* The hook only reads refs and events, never markup. */}
      <div ref={slotRef} onKeyDown={isOpen ? onKeyDown : undefined}>
        <div ref={panelRef}>
          <button type="button" data-testid="first">
            first
          </button>
          <button type="button" data-testid="second">
            second
          </button>
        </div>
      </div>
    </div>
  );
}

describe("useFlyoutDialog", () => {
  it("moves focus into the panel on open and hands it back on close", () => {
    const { rerender } = render(<Harness isOpen={false} onClose={() => {}} />);
    const outside = screen.getByTestId("outside");
    outside.focus();

    rerender(<Harness isOpen={true} onClose={() => {}} />);
    expect(screen.getByTestId("first")).toHaveFocus();

    rerender(<Harness isOpen={false} onClose={() => {}} />);
    expect(outside).toHaveFocus();
  });

  it("prefers a data-autofocus element over DOM order for initial focus", () => {
    function WithAutofocus() {
      const { slotRef, panelRef } = useFlyoutDialog(true, () => {});
      return (
        <div ref={slotRef}>
          <div ref={panelRef}>
            <button type="button">close</button>
            <input aria-label="filter" data-autofocus />
          </div>
        </div>
      );
    }
    render(<WithAutofocus />);
    expect(screen.getByRole("textbox", { name: "filter" })).toHaveFocus();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Harness isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(screen.getByTestId("first"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("wraps Tab at both ends so focus cannot leave the panel", () => {
    render(<Harness isOpen={true} onClose={() => {}} />);
    const first = screen.getByTestId("first");
    const second = screen.getByTestId("second");

    second.focus();
    fireEvent.keyDown(second, { key: "Tab" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(second).toHaveFocus();
  });

  it("closes on a pointer press outside, but not inside", () => {
    const onClose = vi.fn();
    render(<Harness isOpen={true} onClose={onClose} />);

    fireEvent.pointerDown(screen.getByTestId("first"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does nothing while closed", () => {
    const onClose = vi.fn();
    render(<Harness isOpen={false} onClose={onClose} />);

    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
