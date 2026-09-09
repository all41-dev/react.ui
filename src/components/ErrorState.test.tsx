import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("announces the title and the message", () => {
    render(<ErrorState title="Could not load" message="502 Bad Gateway" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Could not load");
    expect(alert).toHaveTextContent("502 Bad Gateway");
  });

  it("offers no button without a retry handler", () => {
    render(<ErrorState message="Gone" />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("runs the retry from its button, under the given label", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} retryLabel="Reload" />);

    await user.click(screen.getByRole("button", { name: "Reload" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
