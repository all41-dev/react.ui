import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("renders blocks and inline marks as elements, never as HTML", () => {
    const { container } = render(
      <Markdown source={"# Title\n\n- one\n- **two**\n\n<b>raw</b>"} />
    );

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("two").tagName).toBe("STRONG");
    // Markup in the source is text, not a node.
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("<b>raw</b>")).toBeInTheDocument();
  });

  it("drops a link whose target is not a safe scheme", () => {
    render(<Markdown source={"[ok](https://example.com) [bad](javascript:void%200)"} />);

    expect(screen.getByRole("link", { name: "ok" })).toHaveAttribute(
      "href",
      "https://example.com"
    );
    expect(screen.queryByRole("link", { name: "bad" })).not.toBeInTheDocument();
    expect(screen.getByText("[bad](javascript:void%200)")).toBeInTheDocument();
  });

  it("renders CRLF source, block by block, without stalling", () => {
    render(<Markdown source={"# Title\r\n\r\n- a\r\n- b\r\n\r\ntext\r\n"} />);

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("text")).toBeInTheDocument();
  });

  it("renders nothing for blank source", () => {
    const { container } = render(<Markdown source={"  \n "} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("takes the caller's wrapper classes beside its own block spacing", () => {
    const { container } = render(<Markdown source="text" className="text-xs" />);

    expect(container.firstElementChild).toHaveClass("space-y-2", "text-xs");
  });
});
