import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorView } from "@codemirror/view";
import { CodeView } from "./CodeView";

const content = () => document.querySelector(".cm-content") as HTMLElement;

function view(): EditorView {
  const found = EditorView.findFromDOM(content());
  if (!found) throw new Error("CodeView did not mount a CodeMirror view");
  return found;
}

/** The highlight class on the innermost span wrapping `text`, or null when unwrapped. */
function highlightClass(text: string): string | null {
  const spans = Array.from(content().querySelectorAll("span"));
  const span = spans.find((s) => s.textContent === text);
  return span?.className || null;
}

/* One line: jsdom reports a tiny box, so CodeMirror renders only the first lines and
   stands a gap in for the rest. */
const DOC = '{ "name": "Odoo", "count": 3, "on": true }';

describe("CodeView", () => {
  it("renders the document read-only, with the gutter and fold handles", () => {
    render(<CodeView value={DOC} language="json" />);

    expect(content().textContent).toBe(DOC);
    expect(content()).toHaveAttribute("contenteditable", "false");
    expect(content()).toHaveAttribute("tabindex", "0");
    expect(document.querySelector(".cm-lineNumbers")).toBeInTheDocument();
    expect(document.querySelector(".cm-foldGutter")).toBeInTheDocument();
  });

  it("colours keys, strings and numbers with distinct highlight classes", async () => {
    render(<CodeView value={DOC} language="json" />);

    await waitFor(() => expect(highlightClass('"name"')).not.toBeNull());
    const key = highlightClass('"name"');
    const string = highlightClass('"Odoo"');
    const number = highlightClass("3");
    const bool = highlightClass("true");

    expect(string).not.toBeNull();
    expect(number).not.toBeNull();
    expect(key).not.toBe(string);
    expect(key).not.toBe(number);
    expect(string).not.toBe(number);
    // Numbers, booleans and null share one colour.
    expect(bool).toBe(number);
  });

  it("carries no editor chrome", () => {
    const { container } = render(<CodeView value={DOC} language="json" />);

    expect(container.textContent).not.toContain("Format");
    expect(container.textContent).not.toContain("Expand");
    expect(container.textContent).not.toContain("Ln ");
  });

  it("applies a new value to the same view", () => {
    const { rerender } = render(<CodeView value="a" language="text" />);
    const first = view();

    rerender(<CodeView value="b" language="text" />);

    expect(view()).toBe(first);
    expect(view().state.doc.toString()).toBe("b");
  });

  it("refuses edits", () => {
    render(<CodeView value="a" language="text" />);

    view().dispatch({ changes: { from: 0, to: 1, insert: "z" } });

    // The read-only facet blocks user input; a direct dispatch is the only way to
    // change the document, and nothing outside the component holds the view.
    expect(view().state.readOnly).toBe(true);
    expect(content()).toHaveAttribute("aria-readonly", "true");
  });

  it("drops the gutter on request and labels the content", () => {
    render(<CodeView value="a" lineNumbers={false} aria-label="Raw record" />);

    expect(document.querySelector(".cm-lineNumbers")).not.toBeInTheDocument();
    expect(document.querySelector(".cm-foldGutter")).not.toBeInTheDocument();
    expect(content()).toHaveAttribute("aria-label", "Raw record");
  });

  it("caps its height at the given rows unless filling", () => {
    const { container, rerender } = render(<CodeView value="a" rows={5} />);
    const host = container.firstElementChild as HTMLElement;

    expect(host.style.getPropertyValue("--rui-code-max-h")).toBe("118px");

    rerender(<CodeView value="a" rows={5} fill />);
    expect(host.style.getPropertyValue("--rui-code-max-h")).toBe("");
    expect(host.className).toContain("h-full");
    expect(document.querySelector(".cm-editor")).toHaveClass("rui-code-fill");
  });
});
