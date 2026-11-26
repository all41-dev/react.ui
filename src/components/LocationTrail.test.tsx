import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocationTrail, type TrailSegment } from "./LocationTrail";

/* Tests for the location trail: order, separators, the current segment, and that nothing in it navigates. */

const SEGMENTS: TrailSegment[] = [
  { key: "partner", label: "Acme SA", title: "Acme SA" },
  { key: "customer", node: <button type="button">Harps</button> },
  { key: "page", label: "Workbench", minWidth: "lg" },
  { key: "object", node: <h2>Odoo</h2> },
];

const items = () =>
  within(screen.getByRole("list", { name: "Location" })).getAllByRole("listitem");

describe("LocationTrail", () => {
  it("lists the segments in order under one labelled list", () => {
    render(<LocationTrail segments={SEGMENTS} />);

    expect(items().map((li) => li.textContent?.replace(/^›/, ""))).toEqual([
      "Acme SA",
      "Harps",
      "Workbench",
      "Odoo",
    ]);
  });

  it("separates segments with chevrons hidden from assistive tech, none before the first", () => {
    render(<LocationTrail segments={SEGMENTS} />);

    const [first, ...rest] = items();
    expect(first.textContent).toBe("Acme SA");
    for (const li of rest) {
      const separator = li.firstElementChild;
      expect(separator).toHaveTextContent("›");
      expect(separator).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("marks only the last segment as the current location", () => {
    render(<LocationTrail segments={SEGMENTS} />);

    const all = items();
    expect(all.at(-1)).toHaveAttribute("aria-current", "location");
    for (const li of all.slice(0, -1)) {
      expect(li).not.toHaveAttribute("aria-current");
    }
  });

  it("renders a node segment as given rather than as text", () => {
    render(<LocationTrail segments={SEGMENTS} />);

    expect(screen.getByRole("heading", { name: "Odoo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Harps" })).toBeInTheDocument();
  });

  it("keeps the full text as a tooltip on a label that may truncate", () => {
    render(<LocationTrail segments={SEGMENTS} />);

    expect(screen.getByText("Acme SA")).toHaveAttribute("title", "Acme SA");
  });

  it("navigates nowhere: no link of its own", () => {
    render(<LocationTrail segments={SEGMENTS} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("hides a collapsible segment below its breakpoint", () => {
    render(<LocationTrail segments={SEGMENTS} />);

    expect(items()[2]).toHaveClass("hidden", "lg:flex");
    expect(items()[0]).not.toHaveClass("hidden");
  });
});
