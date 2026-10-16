import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFocusTrap } from "./useFocusTrap";

function Surface({ onClose }: { onClose: () => void }) {
  const ref = useFocusTrap<HTMLDivElement>(true);
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-label="Edit">
      <input aria-label="Name" />
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && <Surface onClose={() => setOpen(false)} />}
    </>
  );
}

describe("useFocusTrap — where focus goes on close", () => {
  /* The trap filters candidates by `getClientRects`, which jsdom leaves empty. */
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
      { width: 10, height: 10 },
    ] as unknown as DOMRectList);
  });
  afterEach(() => vi.restoreAllMocks());

  it("opens on the first control", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("keeps focus on the opener after a keyboard close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    await user.type(screen.getByLabelText("Name"), "abc");
    await user.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(opener).toHaveFocus();
  });

  it("releases focus from the opener after a pointer close, even after typing", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);
    await user.type(screen.getByLabelText("Name"), "abc");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(opener).not.toHaveFocus();
    expect(document.activeElement).toBe(document.body);
  });

  it("treats Escape as a keyboard close", () => {
    function EscHarness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button">Open</button>
          {open && (
            <div
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            >
              <Surface onClose={() => setOpen(false)} />
            </div>
          )}
        </>
      );
    }
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    render(<EscHarness />);
    const field = screen.getByLabelText("Name");
    expect(field).toHaveFocus();
    fireEvent.keyDown(field, { key: "Escape" });
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
