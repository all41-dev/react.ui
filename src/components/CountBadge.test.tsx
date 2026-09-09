import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountBadge } from "./CountBadge";

describe("CountBadge", () => {
  it("shows the count", () => {
    render(<CountBadge count={12} />);

    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("carries a title when given one, for the count's meaning", () => {
    render(<CountBadge count={3} title="3 objects in error" />);

    expect(screen.getByTitle("3 objects in error")).toHaveTextContent("3");
  });

  it("switches its look by tone and size without changing the text", () => {
    const { rerender } = render(<CountBadge count={1} tone="danger" size="sm" />);
    const first = screen.getByText("1").className;

    rerender(<CountBadge count={1} tone="accent" size="md" />);

    expect(screen.getByText("1").className).not.toBe(first);
  });
});
