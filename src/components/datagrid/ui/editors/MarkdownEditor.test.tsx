import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownEditor } from "./MarkdownEditor";

/*
 * The toolbar applies a tool from `mousedown` (to act before the textarea loses its
 * selection) and from a keyboard-synthesised `click` (detail === 0). The double-apply
 * guard between those two paths is invisible to the type checker, so both activation
 * paths are pinned here with exact call counts.
 */

function Harness({
  onChange,
  initial = "",
}: {
  onChange: (v: string) => void;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <MarkdownEditor
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      aria-label="Notes"
    />
  );
}

describe("MarkdownToolbar activation", () => {
  it("a mouse click applies the tool exactly once", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Bold" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("**text**");
  });

  it("keyboard activation applies the tool exactly once", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const bold = screen.getByRole("button", { name: "Bold" });
    act(() => bold.focus());
    expect(bold).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("**text**");
  });

  it("wraps the current textarea selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial="hello" />);

    const ta = screen.getByRole("textbox", { name: "Notes" }) as HTMLTextAreaElement;
    act(() => {
      ta.focus();
      ta.setSelectionRange(0, 5);
    });
    await user.click(screen.getByRole("button", { name: "Bold" }));

    expect(onChange).toHaveBeenLastCalledWith("**hello**");
  });
});

describe("preview tab", () => {
  it("disables the tools and swaps the textarea for the preview", async () => {
    const user = userEvent.setup();
    render(<Harness onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /preview/i }));

    expect(screen.getByRole("button", { name: /preview/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Bold" })).toBeDisabled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing to preview")).toBeInTheDocument();
  });
});
