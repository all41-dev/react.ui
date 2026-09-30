import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingScreen } from "./LoadingScreen";

describe("LoadingScreen", () => {
  it("announces its message as a status", () => {
    render(<LoadingScreen message="Checking your session…" />);

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session…");
  });

  it("full: a glow, two rings and the dots, all stopped under reduced motion", () => {
    const { container } = render(<LoadingScreen />);

    const animated = container.querySelectorAll(
      ".animate-spin, .animate-pulse, .animate-bounce"
    );
    expect(animated.length).toBe(6);
    animated.forEach((el) => expect(el).toHaveClass("motion-reduce:animate-none"));
  });

  it("quiet: one ring and the message, nothing else that moves", () => {
    const { container } = render(<LoadingScreen variant="quiet" message="Loading…" />);

    expect(container.querySelectorAll(".animate-spin").length).toBe(1);
    expect(container.querySelector(".animate-pulse")).toBeNull();
    expect(container.querySelector(".animate-bounce")).toBeNull();
    expect(container.querySelector(".animate-slide-down")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });
});
