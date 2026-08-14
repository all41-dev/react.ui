import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { currentCompletions, startCompletion } from "@codemirror/autocomplete";
import { CellEditPopover } from "./CellEditPopover";
import type { WithMeta } from "../../types/column";

type Row = { id: number; filter: string };

const column: WithMeta<Row, Record<string, unknown>> = {
  accessorKey: "filter",
  header: "Filter",
  meta: {
    label: "Filter",
    editor: "code",
    cellEdit: true,
    editorProps: {
      language: "javascript",
      mode: "inline",
      completions: () => [{ label: "ma1_name" }],
    },
  },
};

const state = {
  row: { id: 1, filter: "" },
  columnId: "filter",
  anchor: { top: 100, bottom: 120, left: 40, width: 320 },
};

function setup(onCancel: () => void) {
  render(
    <CellEditPopover
      state={state}
      column={column}
      onCancel={onCancel}
      onSave={async () => {}}
    />
  );
}

function view(): EditorView {
  const el = document.querySelector(".cm-content");
  const found = el ? EditorView.findFromDOM(el as HTMLElement) : null;
  if (!found) throw new Error("the popover did not mount a CodeMirror view");
  return found;
}

/*
 * The popover listens on `document`, so the keystroke has to travel the real path from
 * the editor to see whether CodeMirror claimed it on the way.
 */
function escapeFromEditor() {
  document
    .querySelector(".cm-content")!
    .dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
    );
}

describe("CellEditPopover", () => {
  it("cancels on Escape when nothing inside the editor consumed it", async () => {
    const onCancel = vi.fn();
    setup(onCancel);
    await screen.findByRole("dialog", { name: "Edit Filter" });

    escapeFromEditor();
    expect(onCancel).toHaveBeenCalled();
  });

  /*
   * Escape dismissing the completion popup must not also close the popover — that
   * discards everything typed, on a keystroke the user meant for the popup.
   */
  it("keeps the edit when Escape only dismissed the completion popup", async () => {
    const onCancel = vi.fn();
    setup(onCancel);
    await screen.findByRole("dialog", { name: "Edit Filter" });

    const cm = view();
    cm.dispatch({
      changes: { from: 0, insert: "context.obj." },
      selection: { anchor: 12 },
    });
    startCompletion(cm);
    await waitFor(() => expect(currentCompletions(view().state)).toHaveLength(1));

    escapeFromEditor();
    expect(onCancel).not.toHaveBeenCalled();
    expect(view().state.doc.toString()).toBe("context.obj.");

    // The popup is gone, so the next Escape is the one that closes the popover.
    escapeFromEditor();
    expect(onCancel).toHaveBeenCalled();
  });

  it("cancels when the backdrop is clicked", async () => {
    const onCancel = vi.fn();
    setup(onCancel);
    await screen.findByRole("dialog", { name: "Edit Filter" });

    await userEvent.click(document.querySelector(".fixed.inset-0") as HTMLElement);
    expect(onCancel).toHaveBeenCalled();
  });

  it("saves the edited value", async () => {
    const onSave = vi.fn(async () => {});
    render(
      <CellEditPopover
        state={state}
        column={column}
        onCancel={() => {}}
        onSave={onSave}
      />
    );
    view().dispatch({ changes: { from: 0, insert: "context.obj.city" } });

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("context.obj.city"));
  });

  it("shows the reason when saving fails", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("Filter rejected by the server");
    });
    render(
      <CellEditPopover
        state={state}
        column={column}
        onCancel={() => {}}
        onSave={onSave}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("Filter rejected by the server")
    ).toBeInTheDocument();
  });

  // The stored shape and the editable shape differ; the popover opens on the latter.
  it("seeds the editor through the column's toForm", async () => {
    render(
      <CellEditPopover
        state={{ ...state, row: { id: 1, filter: "1250" } }}
        column={{
          ...column,
          meta: { ...column.meta, toForm: (raw) => `cents(${String(raw)})` },
        }}
        onCancel={() => {}}
        onSave={async () => {}}
      />
    );
    expect(view().state.doc.toString()).toBe("cents(1250)");
  });
});

/**
 * The scroll listener is on the capture phase, so it sees every descendant scroll — the
 * popover's own included. Cancelling on those discards the edit while the user is
 * scrolling the very field they are editing.
 */
describe("scrolling while the popover is open", () => {
  const textColumn: WithMeta<Row, Record<string, unknown>> = {
    accessorKey: "filter",
    header: "Filter",
    meta: { label: "Filter", editor: "textarea", cellEdit: true },
  };

  function setupText(onCancel: () => void) {
    render(
      <CellEditPopover
        state={state}
        column={textColumn}
        onCancel={onCancel}
        onSave={async () => {}}
      />
    );
  }

  const scrollFrom = (el: Element) =>
    el.dispatchEvent(new Event("scroll", { bubbles: false }));

  it("keeps the edit when the scroll came from inside", async () => {
    const onCancel = vi.fn();
    setupText(onCancel);
    const dialog = await screen.findByRole("dialog", { name: "Edit Filter" });

    scrollFrom(screen.getByLabelText("Filter"));
    expect(onCancel).not.toHaveBeenCalled();

    scrollFrom(dialog);
    expect(onCancel).not.toHaveBeenCalled();
  });

  /* The anchor rect is stale the moment anything behind the popover moves, so a scroll
     out there still has to close it. */
  it("cancels when the page behind it scrolls", async () => {
    const onCancel = vi.fn();
    setupText(onCancel);
    await screen.findByRole("dialog", { name: "Edit Filter" });

    scrollFrom(document.body);
    expect(onCancel).toHaveBeenCalled();
  });
});
