import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useJsonInspector } from "./jsonInspectorContext";
import { JsonInspectorProvider } from "./JsonInspectorProvider";

vi.mock("../LazyCode", () => import("../../test/codeViewStub"));

/* Tests for the app-wide drawer owner. */


function Openers() {
  const { open, close } = useJsonInspector();
  return (
    <>
      <button type="button" onClick={() => open({ title: "First", value: { a: 1 } })}>
        first
      </button>
      <button type="button" onClick={() => open({ title: "Second", value: { b: 2 } })}>
        second
      </button>
      <button type="button" onClick={close}>
        close
      </button>
    </>
  );
}

describe("JsonInspectorProvider", () => {
  it("renders no drawer until something opens one", () => {
    render(
      <JsonInspectorProvider>
        <Openers />
      </JsonInspectorProvider>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps one drawer: a second open swaps the record, close removes it", async () => {
    const user = userEvent.setup();
    render(
      <JsonInspectorProvider>
        <Openers />
      </JsonInspectorProvider>
    );

    await user.click(screen.getByRole("button", { name: "first" }));
    expect(screen.getByRole("dialog", { name: "First" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "second" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Second" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
