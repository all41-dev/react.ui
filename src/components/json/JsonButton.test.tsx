import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { chipClass } from "../DisclosureButton";
import { JsonButton } from "./JsonButton";
import { JsonInspectorProvider } from "./JsonInspectorProvider";

vi.mock("../LazyCode", () => import("../../test/codeViewStub"));

/* Tests for the control that opens the JSON drawer. */


const TARGET = { title: "Odoo", value: { uuid: "m1" }, kind: "Modules › OdooModule" };

function renderButton(variant?: "label" | "icon") {
  const onRowClick = vi.fn();
  render(
    <JsonInspectorProvider>
      {/* A row that navigates on click, as both grids do. */}
      <div role="row" tabIndex={0} onClick={onRowClick} onKeyDown={onRowClick}>
        <JsonButton target={TARGET} variant={variant} />
      </div>
    </JsonInspectorProvider>
  );
  return { onRowClick };
}

describe("JsonButton", () => {
  it("reads as JSON in the bar and names the record in the icon form", () => {
    const { unmount } = render(
      <JsonInspectorProvider>
        <JsonButton target={TARGET} />
      </JsonInspectorProvider>
    );
    expect(screen.getByRole("button", { name: "JSON" })).toHaveAttribute(
      "title",
      "Show JSON: Odoo"
    );
    unmount();

    renderButton("icon");
    const icon = screen.getByRole("button", { name: "Show JSON: Odoo" });
    expect(icon).not.toHaveTextContent("JSON");
  });

  it("wears the chip a disclosure button beside it wears, as a chip", () => {
    render(
      <JsonInspectorProvider>
        <JsonButton target={TARGET} variant="chip" />
      </JsonInspectorProvider>
    );
    const chip = screen.getByRole("button", { name: "JSON" });
    for (const cls of chipClass.split(" ")) expect(chip).toHaveClass(cls);
  });

  it("opens the drawer on its target without the click reaching the row", async () => {
    const user = userEvent.setup();
    const { onRowClick } = renderButton("icon");

    await user.click(screen.getByRole("button", { name: "Show JSON: Odoo" }));

    const dialog = screen.getByRole("dialog", { name: "Odoo" });
    expect(dialog).toHaveTextContent("Modules › OdooModule");
    expect(await screen.findByTestId("code-view")).toHaveTextContent('"uuid": "m1"');
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("closes again on Escape", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "JSON" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("refuses to render outside the provider", () => {
    const silenced = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<JsonButton target={TARGET} />)).toThrow(
      /inside JsonInspectorProvider/
    );
    silenced.mockRestore();
  });
});
