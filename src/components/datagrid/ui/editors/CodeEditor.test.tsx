import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import {
  acceptCompletion,
  currentCompletions,
  startCompletion,
} from "@codemirror/autocomplete";
import { CodeEditor } from "./CodeEditor";
import { parseMemberAccess, parseMemberPath } from "./codeMirrorSetup";
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

/**
 * Opens the popup and waits out CodeMirror's `interactionDelay` — a mis-click guard that
 * makes `acceptCompletion` a no-op for the first 75ms after the options appear.
 */
async function openCompletions(expected: number) {
  startCompletion(editor());
  await waitFor(() => expect(currentCompletions(editor().state)).toHaveLength(expected));
  await new Promise((resolve) => setTimeout(resolve, 120));
}

describe("parseMemberPath", () => {
  const at = (text: string) => parseMemberPath(text, text.length);

  it("splits a partial word from its resolved prefix", () => {
    expect(at("context.obj.ci")).toEqual({ path: ["context", "obj"], word: "ci" });
  });

  it("treats a trailing dot as a complete path with no word", () => {
    expect(at("context.obj.")).toEqual({ path: ["context", "obj"], word: "" });
  });

  it("walks arbitrarily deep for nested objects", () => {
    expect(at("context.obj.address.geo.")).toEqual({
      path: ["context", "obj", "address", "geo"],
      word: "",
    });
  });

  it("returns a bare word with an empty path", () => {
    expect(at("cont")).toEqual({ path: [], word: "cont" });
  });

  it("reads only the chain touching the cursor", () => {
    expect(at("![1, 2].includes(context.obj.ma1_")).toEqual({
      path: ["context", "obj"],
      word: "ma1_",
    });
  });

  it("stops at a non-identifier boundary", () => {
    expect(at("a + ")).toEqual({ path: [], word: "" });
  });

  /*
   * Source-system columns are not always valid identifiers, so bracket notation is the
   * only way to reach them and has to resolve like a dot.
   */
  it("reads a bracketed segment as part of the path", () => {
    expect(at('context.obj["qwe qwe qwe"].')).toEqual({
      path: ["context", "obj", "qwe qwe qwe"],
      word: "",
    });
  });

  it("captures a partial bracket string, spaces included", () => {
    expect(at('context.obj["qwe qw')).toEqual({
      path: ["context", "obj"],
      word: "qwe qw",
    });
  });

  it("treats a bare opening bracket as an empty word", () => {
    expect(at("context.obj[")).toEqual({ path: ["context", "obj"], word: "" });
  });

  it("chains bracket segments without a separator", () => {
    expect(at('context.obj["a b"]["c d"].')).toEqual({
      path: ["context", "obj", "a b", "c d"],
      word: "",
    });
  });

  it("handles single quotes and escaped quotes", () => {
    expect(at("context.obj['a b'].")).toEqual({
      path: ["context", "obj", "a b"],
      word: "",
    });
    expect(at('context.obj["a\\"b"].')).toEqual({
      path: ["context", "obj", 'a"b'],
      word: "",
    });
  });

  it("does not mistake a closed bracket string for an open one", () => {
    expect(at('context.obj["a b"].ci')).toEqual({
      path: ["context", "obj", "a b"],
      word: "ci",
    });
  });

  it("reports the access kind and the range to replace", () => {
    const dot = parseMemberAccess("context.obj.ci", 14);
    expect(dot).toMatchObject({ access: "dot", from: 12, to: 14 });

    const bracket = parseMemberAccess('context.obj["qw', 15);
    expect(bracket).toMatchObject({ access: "bracket", quote: '"', from: 13, to: 15 });

    const empty = parseMemberAccess("context.obj[", 12);
    expect(empty).toMatchObject({ access: "bracket", from: 12, to: 12 });
    expect(empty.quote).toBeUndefined();
  });

  it("reads the text before the cursor, not the whole document", () => {
    const text = "context.obj.city && other.stuff";
    expect(parseMemberPath(text, "context.obj.ci".length)).toEqual({
      path: ["context", "obj"],
      word: "ci",
    });
  });
});

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

  it("drops the chrome in inline mode", () => {
    render(<CodeEditor value="x" onChange={() => {}} language="javascript" mode="inline" />);
    expect(screen.queryByText("javascript")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Ln /)).not.toBeInTheDocument();
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
});
