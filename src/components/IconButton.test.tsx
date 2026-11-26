import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("is named by its label, which is the tooltip too", () => {
    render(<IconButton label="Copy">c</IconButton>);

    const button = screen.getByRole("button", { name: "Copy" });
    expect(button).toHaveAttribute("title", "Copy");
    expect(button).toHaveAttribute("type", "button");
  });

  it("takes another tooltip without losing its name", () => {
    render(
      <IconButton label="Delete" title="Three maps still use it">
        d
      </IconButton>
    );

    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute(
      "title",
      "Three maps still use it"
    );
  });

  it("passes the button's own attributes through, and does nothing while disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(
      <IconButton label="Copy" size="sm" onClick={onClick} disabled>
        c
      </IconButton>
    );
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(onClick).not.toHaveBeenCalled();

    rerender(
      <IconButton label="Copy" size="sm" onClick={onClick}>
        c
      </IconButton>
    );
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
