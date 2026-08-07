import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useOutsideDismiss } from "./useOutsideDismiss";

/*
 * The hook's whole reason to exist is containment-based dismissal: a click anywhere
 * inside the wrapper — including a nested panel that is a DOM child of it — must not
 * dismiss, or the Columns-popover-inside-overflow-menu case closes the menu underneath
 * itself. The nested half is asserted end-to-end in DataGrid.test.tsx; these pin the
 * hook's own contract.
 */

function Harness({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideDismiss(open, ref, onDismiss);
  return (
    <>
      <div ref={ref}>
        <button type="button">inside</button>
        <div>
          <button type="button">nested inside</button>
        </div>
      </div>
      <button type="button">outside</button>
    </>
  );
}

describe("useOutsideDismiss", () => {
  it("dismisses on a press outside the wrapper", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Harness open onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("does not dismiss on a press inside, however deeply nested", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Harness open onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "inside" }));
    await user.click(screen.getByRole("button", { name: "nested inside" }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("dismisses on Escape", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Harness open onDismiss={onDismiss} />);

    await user.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("is inert while closed", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Harness open={false} onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "outside" }));
    await user.keyboard("{Escape}");
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
