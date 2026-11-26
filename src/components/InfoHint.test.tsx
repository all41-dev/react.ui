import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InfoHint } from "./InfoHint";

describe("InfoHint", () => {
  it("is a focusable icon named after its text, with the text on hover only", () => {
    render(<InfoHint text="Pair levels first, then the fields inside them." />);

    const hint = screen.getByRole("button", {
      name: "Pair levels first, then the fields inside them.",
    });
    expect(hint).toHaveAttribute("type", "button");
    expect(hint).toHaveTextContent("");
    expect(hint).toHaveAttribute(
      "data-tooltip-content",
      "Pair levels first, then the fields inside them."
    );
  });
});
