import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JsonTarget } from "./jsonTarget";
import { JsonInspector } from "./JsonInspector";

/* Tests for the raw-record drawer. */


const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../LazyCode", () => import("../../test/codeViewStub"));
vi.mock("../../utils/toast", () => ({ toast }));

const open = (target: Partial<JsonTarget> & { value: unknown }) => {
  const onClose = vi.fn();
  render(<JsonInspector title="Odoo" {...target} onClose={onClose} />);
  return { onClose };
};

const dialog = () => screen.getByRole("dialog", { name: "Odoo" });
const code = () => screen.findByTestId("code-view");

beforeEach(() => {
  toast.success.mockClear();
  toast.error.mockClear();
});

describe("JsonInspector", () => {
  it("renders a record as formatted JSON, titled, kinded and counted", async () => {
    open({ value: { uuid: "m-1", instanceName: "Odoo" }, kind: "Modules › OdooModule" });

    expect(dialog()).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Modules › OdooModule")).toBeInTheDocument();
    const view = await code();
    expect(view.textContent).toBe('{\n  "uuid": "m-1",\n  "instanceName": "Odoo"\n}');
    expect(view).toHaveAttribute("data-language", "json");
    expect(screen.getByText("4 lines")).toBeInTheDocument();
    expect(screen.getByText("45 B")).toBeInTheDocument();
    expect(screen.getByText("JSON")).toBeInTheDocument();
  });

  it("shows a string value verbatim, in the grammar it was opened with", async () => {
    // Transformation-function bodies arrive as plain strings.
    open({ value: "function map(r) {\n  return r.id;\n}", language: "javascript" });

    const view = await code();
    expect(view.textContent).toBe("function map(r) {\n  return r.id;\n}");
    expect(view).toHaveAttribute("data-language", "javascript");
    expect(screen.getByText("3 lines")).toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
  });

  it("survives a value that cannot be serialised", async () => {
    const circular: Record<string, unknown> = { name: "loop" };
    circular.self = circular;

    expect(() => open({ value: circular })).not.toThrow();
    expect((await code()).textContent).toContain("object");
  });

  it("lands focus on Copy, and copying reports itself", async () => {
    const user = userEvent.setup();
    open({ value: { a: 1 } });

    const copy = screen.getByRole("button", { name: "Copy to clipboard" });
    expect(copy).toHaveFocus();

    await user.click(copy);

    expect(await navigator.clipboard.readText()).toBe('{\n  "a": 1\n}');
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Copied"));
  });

  it("closes on the close button", async () => {
    const user = userEvent.setup();
    const { onClose } = open({ value: { a: 1 } });

    await user.click(screen.getByRole("button", { name: "Close JSON inspector" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape from inside the dialog", async () => {
    const user = userEvent.setup();
    const { onClose } = open({ value: { a: 1 } });

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves an Escape the code view has already used alone", () => {
    const { onClose } = open({ value: { a: 1 } });

    // The view's find panel consumes Escape and marks it handled; the drawer
    // must not read that press as its own.
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    event.preventDefault();
    screen.getByRole("button", { name: "Copy to clipboard" }).dispatchEvent(event);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on a pointerdown outside the drawer", async () => {
    const user = userEvent.setup();
    const { onClose } = open({ value: { a: 1 } });

    await user.pointer({ keys: "[MouseLeft>]", target: document.body });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns focus to where it came from once closed", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const { unmount } = render(
      <JsonInspector title="Odoo" value={{ a: 1 }} onClose={() => {}} />
    );
    expect(opener).not.toHaveFocus();

    unmount();

    expect(opener).toHaveFocus();
    opener.remove();
  });
});
