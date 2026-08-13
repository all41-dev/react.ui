import { render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { startCompletion } from "@codemirror/autocomplete";
import { CodeEditor } from "./CodeEditor";
import { parseMemberPath } from "./codeMirrorSetup";
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
