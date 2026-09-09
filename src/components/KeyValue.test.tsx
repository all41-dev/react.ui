import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KeyValue } from "./KeyValue";

describe("KeyValue", () => {
  it("shows the label and the value", () => {
    render(<KeyValue label="State" value="Enabled" />);

    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("sets the value in the mono font when asked", () => {
    render(<KeyValue label="Code" value="supplier.v1" mono />);

    expect(screen.getByText("supplier.v1").className).toContain("font-mono");
  });

  it("carries a title for the pair, so a hover can explain the value", () => {
    render(<KeyValue label="Flow" value="2 read → 1 write" title="Readers and writers" />);

    expect(screen.getByTitle("Readers and writers")).toHaveTextContent("Flow");
  });
});
