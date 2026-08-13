import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import {
  acceptCompletion,
  completionStatus,
  currentCompletions,
  startCompletion,
} from "@codemirror/autocomplete";
import { diagnosticCount, forceLinting } from "@codemirror/lint";
import { CodeEditor } from "./CodeEditor";
import type { CodeCompletionContext } from "./codeEditorTypes";

/*
 * Edits are dispatched through CodeMirror rather than simulated as keystrokes: jsdom's
 * contenteditable does not restore the DOM selection between renders, so typed
 * characters arrive shuffled and the test would measure jsdom, not this component.
 */
function editor(): EditorView {
  const content = document.querySelector(".cm-content");
  const view = content ? EditorView.findFromDOM(content as HTMLElement) : null;
  if (!view) throw new Error("CodeEditor did not mount a CodeMirror view");
  return view;
}

function type(text: string) {
  const view = editor();
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    selection: { anchor: text.length },
  });
}

function keyOn(
  el: HTMLElement,
  key: string,
  modifiers: { shiftKey?: boolean; altKey?: boolean } = {}
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    ...modifiers,
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
  return event;
}

const escapeOn = (el: HTMLElement) => keyOn(el, "Escape");

const content = () => document.querySelector(".cm-content") as HTMLElement;

/**
 * Opens the popup and waits out CodeMirror's `interactionDelay` — a mis-click guard that
 * makes `acceptCompletion` a no-op for the first 75ms after the options appear.
 */
async function openCompletions(expected: number) {
  startCompletion(editor());
  await waitFor(() => expect(currentCompletions(editor().state)).toHaveLength(expected));
  await new Promise((resolve) => setTimeout(resolve, 120));
}

describe("CodeEditor", () => {
  it("renders the value and reports the line count", () => {
    render(<CodeEditor value={"a\nb\nc"} onChange={() => {}} language="javascript" />);
    expect(screen.getByText("3 lines")).toBeInTheDocument();
    expect(screen.getByText("javascript")).toBeInTheDocument();
  });

  it("emits an edit back to the controlling parent", async () => {
    function Host() {
      const [value, setValue] = useState("");
      return (
        <>
          <CodeEditor value={value} onChange={setValue} language="javascript" />
          <output data-testid="mirror">{value}</output>
        </>
      );
    }
    render(<Host />);
    type("context.obj.city");
    await waitFor(() =>
      expect(screen.getByTestId("mirror")).toHaveTextContent("context.obj.city")
    );
  });

  it("does not reset the document when the parent echoes the value back", async () => {
    function Host() {
      const [value, setValue] = useState("");
      return <CodeEditor value={value} onChange={setValue} language="javascript" />;
    }
    render(<Host />);
    type("a.b");
    await waitFor(() => expect(editor().state.doc.toString()).toBe("a.b"));
    // The round trip through the parent must leave the cursor where the user left it.
    expect(editor().state.selection.main.head).toBe(3);
  });

  it("asks the completion source for the parsed member path", async () => {
    const seen: CodeCompletionContext[] = [];
    const completions = vi.fn((ctx: CodeCompletionContext) => {
      seen.push(ctx);
      return [{ label: "ma1_name", detail: "string" }];
    });

    function Host() {
      const [value, setValue] = useState("");
      return (
        <CodeEditor
          value={value}
          onChange={setValue}
          language="javascript"
          completions={completions}
        />
      );
    }
    render(<Host />);
    type("context.obj.");
    startCompletion(editor());

    await waitFor(() => expect(completions).toHaveBeenCalled());
    const last = seen[seen.length - 1];
    expect(last.path).toEqual(["context", "obj"]);
    expect(last.word).toBe("");
  });

  it("passes a nested path through to the completion source", async () => {
    const seen: CodeCompletionContext[] = [];
    const completions = vi.fn((ctx: CodeCompletionContext) => {
      seen.push(ctx);
      return [];
    });
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="javascript"
        completions={completions}
      />
    );
    type("context.obj.address.ci");
    startCompletion(editor());

    await waitFor(() => expect(completions).toHaveBeenCalled());
    const last = seen[seen.length - 1];
    expect(last.path).toEqual(["context", "obj", "address"]);
    expect(last.word).toBe("ci");
  });

  it("forwards accessibility attributes to the editable element", () => {
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="javascript"
        id="toBusFilter"
        aria-label="To-bus filter"
        aria-invalid
        aria-describedby="toBusFilter-error"
      />
    );
    const box = screen.getByRole("textbox");
    expect(box).toHaveAttribute("id", "toBusFilter");
    expect(box).toHaveAttribute("aria-label", "To-bus filter");
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAttribute("aria-describedby", "toBusFilter-error");
  });

  /*
   * Validation flips `aria-invalid` and `aria-describedby` mid-edit. Rebuilding the view
   * for that replaces the focused contenteditable, dropping the cursor and the undo
   * history, so the attributes live in a compartment.
   */
  it("applies changed aria attributes without rebuilding the view", () => {
    const props = { value: "a.b", onChange: () => {}, language: "javascript" as const };
    const { rerender } = render(<CodeEditor {...props} id="filter" />);
    const before = editor();

    rerender(
      <CodeEditor {...props} id="filter" aria-invalid aria-describedby="filter-error" />
    );

    expect(editor()).toBe(before);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "aria-describedby",
      "filter-error"
    );
  });

  it("drops the chrome in inline mode", () => {
    render(<CodeEditor value="x" onChange={() => {}} language="javascript" mode="inline" />);
    expect(screen.queryByText("javascript")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Ln /)).not.toBeInTheDocument();
  });

  it("refuses an edit that would add a newline in inline mode", () => {
    render(<CodeEditor value="a" onChange={() => {}} language="text" mode="inline" />);
    const view = editor();
    view.dispatch({ changes: { from: 1, insert: "\nb" } });
    expect(view.state.doc.toString()).toBe("a");
  });

  /*
   * The seed bypasses the transaction filter, so a multi-line value has to be flattened
   * or the field freezes: every later edit would produce a document containing a newline.
   */
  it("flattens a seeded newline and stays editable in inline mode", () => {
    render(<CodeEditor value={"a\nb"} onChange={() => {}} language="text" mode="inline" />);
    const view = editor();
    expect(view.state.doc.toString()).toBe("a b");

    view.dispatch({ changes: { from: 3, insert: "x" } });
    expect(view.state.doc.toString()).toBe("a bx");
  });

  it("offers Format only for a language it can parse", () => {
    const { rerender } = render(
      <CodeEditor value="x" onChange={() => {}} language="javascript" />
    );
    expect(screen.getByRole("button", { name: /format/i })).toBeInTheDocument();

    rerender(<CodeEditor value="x" onChange={() => {}} language="text" />);
    expect(screen.queryByRole("button", { name: /format/i })).not.toBeInTheDocument();
  });

  it("hides Format when read-only", () => {
    render(<CodeEditor value="x" onChange={() => {}} language="javascript" readOnly />);
    expect(screen.queryByRole("button", { name: /format/i })).not.toBeInTheDocument();
  });

  it("rewrites the document when Format succeeds", async () => {
    function Host() {
      const [value, setValue] = useState("const a={b:1}");
      return <CodeEditor value={value} onChange={setValue} language="javascript" />;
    }
    render(<Host />);
    await userEvent.click(screen.getByRole("button", { name: "Format" }));
    await waitFor(() =>
      expect(editor().state.doc.toString()).toBe("const a = { b: 1 }")
    );
  });

  it("announces a parse failure instead of rewriting", async () => {
    render(<CodeEditor value="const a = {" onChange={() => {}} language="javascript" />);
    await userEvent.click(screen.getByRole("button", { name: "Format" }));

    await waitFor(() => expect(screen.getByRole("status")).not.toBeEmptyDOMElement());
    expect(editor().state.doc.toString()).toBe("const a = {");
  });

  it("opens the popup when a dot is typed", async () => {
    const completions = vi.fn(() => [{ label: "ma1_name" }]);
    render(
      <CodeEditor
        value="context"
        onChange={() => {}}
        language="javascript"
        completions={completions}
      />
    );
    const view = editor();
    // What typing a dot produces — the path `activateOnTyping` alone does not cover.
    view.dispatch(view.state.replaceSelection("."));
    await waitFor(() => expect(completions).toHaveBeenCalled());
  });

  it("expands and collapses without rebuilding the view", async () => {
    render(<CodeEditor value="a.b" onChange={() => {}} language="javascript" />);
    const before = editor();
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));

    const collapse = screen.getByRole("button", { name: "Collapse" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    // Same view instance: the cursor and undo history survive the transition.
    expect(editor()).toBe(before);

    await userEvent.click(collapse);
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
    expect(editor()).toBe(before);
  });

  it("becomes a modal surface when expanded", async () => {
    render(
      <CodeEditor
        value="a.b"
        onChange={() => {}}
        language="javascript"
        aria-label="To-bus filter"
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(/To-bus filter/);
    expect(document.body.style.overflow).toBe("hidden");
  });

  // The keymap never sees Escape from the toolbar buttons, which sit outside the editor.
  it("collapses on Escape pressed anywhere in the expanded frame", async () => {
    render(<CodeEditor value="a.b" onChange={() => {}} language="javascript" />);
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));

    const collapse = screen.getByRole("button", { name: "Collapse" });
    collapse.focus();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("collapses when the scrim is clicked", async () => {
    const { container } = render(
      <CodeEditor value="a.b" onChange={() => {}} language="javascript" />
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));

    const scrim = container.querySelector(".fixed.inset-0") as HTMLElement;
    await userEvent.click(scrim);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  /*
   * The surrounding dialog reads `defaultPrevented` to tell "the editor consumed Escape"
   * from "close me". Getting this wrong discards the whole edit on a keystroke meant to
   * dismiss the completion popup.
   */
  it("only marks Escape as handled when the editor consumed it", async () => {
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="javascript"
        completions={() => [{ label: "ma1_name" }]}
      />
    );
    expect(escapeOn(content()).defaultPrevented).toBe(false);

    type("context.obj.");
    await openCompletions(1);
    expect(escapeOn(content()).defaultPrevented).toBe(true);
  });

  /*
   * The source hands over names; writing one in legally is the editor's job. A name with
   * spaces appended to a dot would produce a syntax error, so the dot is rewritten.
   */
  it("rewrites the dot into brackets for a name that is not an identifier", async () => {
    const completions = vi.fn(() => [{ label: "qwe qwe qwe" }]);
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="javascript"
        completions={completions}
      />
    );
    type("context.obj.");
    await openCompletions(1);
    expect(completions).toHaveBeenCalled();

    acceptCompletion(editor());
    await waitFor(() =>
      expect(editor().state.doc.toString()).toBe('context.obj["qwe qwe qwe"]')
    );
    // Past the closing bracket — measured on the escaped text, not the raw label.
    expect(editor().state.selection.main.head).toBe(
      'context.obj["qwe qwe qwe"]'.length
    );
  });

  it("leaves the cursor past the bracket for a name carrying a quote", async () => {
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="javascript"
        completions={() => [{ label: 'a"b' }]}
      />
    );
    type("context.obj.");
    await openCompletions(1);

    acceptCompletion(editor());
    const expected = 'context.obj["a\\"b"]';
    await waitFor(() => expect(editor().state.doc.toString()).toBe(expected));
    expect(editor().state.selection.main.head).toBe(expected.length);
  });

  it("inserts a plain identifier after the dot untouched", async () => {
    const completions = vi.fn(() => [{ label: "ma1_name" }]);
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="javascript"
        completions={completions}
      />
    );
    type("context.obj.");
    await openCompletions(1);

    acceptCompletion(editor());
    await waitFor(() =>
      expect(editor().state.doc.toString()).toBe("context.obj.ma1_name")
    );
  });

  it("fills a name into an already-open bracket string", async () => {
    const completions = vi.fn(() => [{ label: "qwe qwe qwe" }]);
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="javascript"
        completions={completions}
      />
    );
    type('context.obj["qwe');
    await openCompletions(1);

    acceptCompletion(editor());
    await waitFor(() =>
      expect(editor().state.doc.toString()).toBe('context.obj["qwe qwe qwe')
    );
  });

  /*
   * The domain source must add to the language's own completions, not replace them —
   * `override` would silently drop every JavaScript keyword and snippet.
   */
  it("keeps the language's own completions alongside the injected ones", async () => {
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="javascript"
        completions={() => [{ label: "ma1_name" }]}
      />
    );
    type("fun");
    await openCompletions(1);
    expect(currentCompletions(editor().state).map((c) => c.label)).toContain(
      "function"
    );
  });

  it("still completes the domain source in member position", async () => {
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="javascript"
        completions={() => [{ label: "ma1_name" }]}
      />
    );
    type("context.obj.");
    startCompletion(editor());
    await waitFor(() =>
      expect(currentCompletions(editor().state).map((c) => c.label)).toEqual([
        "ma1_name",
      ])
    );
  });

  it("shows injected diagnostics alongside the parser's own", async () => {
    const diagnostics = vi.fn(() => [
      { from: 0, to: 1, severity: "warning" as const, message: "domain rule" },
    ]);
    render(
      <CodeEditor
        value="context"
        onChange={() => {}}
        language="javascript"
        diagnostics={diagnostics}
      />
    );
    await waitFor(() => expect(diagnostics).toHaveBeenCalledWith("context"));
  });

  // Offsets come from a third party; an out-of-range one throws inside CodeMirror.
  it("clamps a diagnostic that runs past the end of the document", async () => {
    render(
      <CodeEditor
        value="ab"
        onChange={() => {}}
        language="text"
        diagnostics={() => [
          { from: 0, to: 999, severity: "error" as const, message: "out of range" },
        ]}
      />
    );
    forceLinting(editor());
    await waitFor(() => expect(diagnosticCount(editor().state)).toBe(1));
  });

  it("leaves the document non-editable when read-only", () => {
    render(<CodeEditor value="a.b" onChange={() => {}} language="javascript" readOnly />);
    expect(content()).toHaveAttribute("contenteditable", "false");
  });

  it("shows the placeholder while the document is empty", async () => {
    function Host() {
      const [value, setValue] = useState("");
      return (
        <CodeEditor
          value={value}
          onChange={setValue}
          language="javascript"
          placeholder="context.obj.name"
        />
      );
    }
    render(<Host />);
    expect(screen.getByText("context.obj.name")).toBeInTheDocument();

    type("x");
    await waitFor(() =>
      expect(screen.queryByText("context.obj.name")).not.toBeInTheDocument()
    );
  });

  // The document is seeded once, so a value the parent changes on its own — a reset, a
  // reload, a fetched default — only reaches the view through the sync effect.
  it("adopts a value pushed by the parent", () => {
    const props = { onChange: () => {}, language: "javascript" as const };
    const { rerender } = render(<CodeEditor {...props} value="a.b" />);
    rerender(<CodeEditor {...props} value="c.d" />);
    expect(editor().state.doc.toString()).toBe("c.d");
  });

  /*
   * Rejecting the sync transaction instead would leave the view permanently behind the
   * form value: the effect does not re-run for a value it has already seen.
   */
  it("flattens a multi-line value pushed by the parent in inline mode", () => {
    const props = { onChange: () => {}, language: "text" as const, mode: "inline" as const };
    const { rerender } = render(<CodeEditor {...props} value="a" />);
    rerender(<CodeEditor {...props} value={"b\nc"} />);
    expect(editor().state.doc.toString()).toBe("b c");
  });

  it("updates the line count as lines are added", async () => {
    render(<CodeEditor value="a" onChange={() => {}} language="javascript" />);
    expect(screen.getByText("1 line")).toBeInTheDocument();

    type("a\nb");
    await waitFor(() => expect(screen.getByText("2 lines")).toBeInTheDocument());
  });

  it("reports the caret position as the selection moves", async () => {
    render(<CodeEditor value={"ab\ncd"} onChange={() => {}} language="javascript" />);
    expect(screen.getByText("Ln 1, Col 1")).toBeInTheDocument();

    editor().dispatch({ selection: { anchor: 4 } });
    await waitFor(() => expect(screen.getByText("Ln 2, Col 2")).toBeInTheDocument());
  });

  // A stale error describes a document that no longer exists.
  it("clears a format error on the next edit", async () => {
    function Host() {
      const [value, setValue] = useState("const a = {");
      return <CodeEditor value={value} onChange={setValue} language="javascript" />;
    }
    render(<Host />);
    await userEvent.click(screen.getByRole("button", { name: "Format" }));
    await waitFor(() => expect(screen.getByRole("status")).not.toBeEmptyDOMElement());

    type("const a = {}");
    await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
  });

  it("formats from the keyboard shortcut", async () => {
    function Host() {
      const [value, setValue] = useState("const a={b:1}");
      return <CodeEditor value={value} onChange={setValue} language="javascript" />;
    }
    render(<Host />);
    keyOn(content(), "f", { shiftKey: true, altKey: true });
    await waitFor(() =>
      expect(editor().state.doc.toString()).toBe("const a = { b: 1 }")
    );
  });

  it("opens no popup when the source has nothing to offer", async () => {
    const completions = vi.fn(() => []);
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        language="text"
        completions={completions}
      />
    );
    type("context.obj.");
    startCompletion(editor());

    await waitFor(() => expect(completions).toHaveBeenCalled());
    await waitFor(() => expect(completionStatus(editor().state)).toBeNull());
  });

  it("releases the scroll lock when unmounted while expanded", async () => {
    const { unmount } = render(
      <CodeEditor value="a.b" onChange={() => {}} language="javascript" />
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  // The focus trap lands on the first button; the point of full screen is the editor.
  it("puts focus in the editor when expanded", async () => {
    render(<CodeEditor value="a.b" onChange={() => {}} language="javascript" />);
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(document.activeElement).toBe(content());
  });

  /*
   * The frame traps Tab, and the editor indents with it. The trap has to stand down for a
   * Tab the editor consumed, or a keystroke meant to indent ejects the user to a button.
   */
  it("indents instead of moving focus on Tab inside the expanded editor", async () => {
    render(<CodeEditor value="a.b" onChange={() => {}} language="javascript" />);
    await userEvent.click(screen.getByRole("button", { name: "Expand" }));

    const event = keyOn(content(), "Tab");
    expect(event.defaultPrevented).toBe(true);
    expect(editor().state.doc.toString()).toBe("  a.b");
    expect(document.activeElement).toBe(content());
  });

  /*
   * Inline mode has no chrome, so there is nowhere to advertise Ctrl+M — and a cell
   * popover otherwise offers only Escape, which cancels the edit. A one-line field has
   * nothing to indent anyway, so Tab is left alone and moves focus.
   */
  it("lets Tab move focus in inline mode", () => {
    render(<CodeEditor value="a" onChange={() => {}} language="text" mode="inline" />);
    const event = keyOn(content(), "Tab");
    expect(event.defaultPrevented).toBe(false);
    expect(editor().state.doc.toString()).toBe("a");
  });
});
