import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DisclosureButton } from "./DisclosureButton";

describe("DisclosureButton", () => {
  it("reads closed and points at nothing until it is open", () => {
    render(
      <DisclosureButton open={false} onToggle={() => {}} controls="band-1">
        Details
      </DisclosureButton>
    );

    const button = screen.getByRole("button", { name: "Details" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).not.toHaveAttribute("aria-controls");
  });

  it("points at the region it unfolded, under the same name", () => {
    render(
      <DisclosureButton open onToggle={() => {}} controls="band-1">
        Details
      </DisclosureButton>
    );

    const button = screen.getByRole("button", { name: "Details" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", "band-1");
  });

  it("says so when the region holds unsaved work", () => {
    render(
      <DisclosureButton open dirty onToggle={() => {}} controls="band-1">
        Details
      </DisclosureButton>
    );

    const button = screen.getByRole("button", { name: /Details, unsaved changes/ });
    expect(button).toHaveAttribute("title", "Unsaved changes");
  });

  it("toggles on click", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <DisclosureButton open={false} onToggle={onToggle}>
        Details
      </DisclosureButton>
    );

    await user.click(screen.getByRole("button", { name: "Details" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
