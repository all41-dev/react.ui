import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TreePicker, type TreePickerProps } from "./TreePicker";
import type { TreePickerRow } from "./treeRows";

/*
 * The tree picker: what it draws from the rows, the chevrons and the arrow walk, the
 * search, controlled expansion, and which rows report a pick.
 */

const row = (
  id: string,
  parentId: string | null,
  over: Partial<TreePickerRow> = {}
): TreePickerRow => ({ id, parentId, kind: "leaf", name: id, ...over });

/*
 * address { street, geo { lat } }   name   tags[]
 * Not in the schema (group) { ghost (dim) }
 */
const ROWS: TreePickerRow[] = [
  row("address", null, { kind: "object", tag: "↔ ADDRESS", tagTone: "accent" }),
  row("street", "address", { tag: "unmapped", tagTone: "warning" }),
  row("geo", "address", { kind: "object" }),
  row("lat", "geo"),
  row("name", null, { state: "selected", tag: "→ NAME" }),
  row("tags", null, { kind: "array" }),
  row("nis", null, { kind: "group", name: "Not in the schema" }),
  row("ghost", "nis", { dim: true }),
];

function renderPicker(over: Partial<TreePickerProps> = {}) {
  const onPick = vi.fn();
  const utils = render(<TreePicker rows={ROWS} onPick={onPick} label="Source" {...over} />);
  return { onPick, ...utils };
}

const items = () => screen.getAllByRole("treeitem").map((li) => li.getAttribute("data-id"));
const item = (id: string) => screen.getByRole("treeitem", { name: new RegExp(`^${id}\\b`) });

describe("TreePicker — what it draws", () => {
  it("renders a tree with one treeitem per visible row, containers expanded at first", () => {
    renderPicker();

    expect(screen.getByRole("tree", { name: "Source" })).toBeInTheDocument();
    expect(items()).toEqual(["address", "street", "geo", "lat", "name", "tags", "ghost"]);
    expect(item("address")).toHaveAttribute("aria-expanded", "true");
    expect(item("street")).not.toHaveAttribute("aria-expanded");
  });

  it("exposes the state and the kind, the selected row as aria-selected, and the tag", () => {
    renderPicker();

    expect(item("name")).toHaveAttribute("aria-selected", "true");
    expect(item("name")).toHaveAttribute("data-state", "selected");
    expect(item("address")).toHaveAttribute("data-kind", "object");
    expect(within(item("street")).getByText("unmapped")).toBeInTheDocument();
    expect(item("ghost")).toHaveAttribute("data-dim", "true");
  });

  it("draws a group as a heading, not a treeitem, with its children under it", () => {
    renderPicker();

    expect(screen.queryByRole("treeitem", { name: /Not in the schema/ })).toBeNull();
    expect(screen.getByText("Not in the schema")).toBeInTheDocument();
    // The heading counts for no level, and names the rows under it to assistive tech.
    expect(item("ghost")).toHaveAttribute("aria-level", "1");
    const describedBy = item("ghost").getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Not in the schema");
    expect(item("street")).not.toHaveAttribute("aria-describedby");
  });

  it("tells each row's position and set size among its siblings, and the level of a nested leaf", () => {
    renderPicker();

    expect(item("street")).toHaveAttribute("aria-posinset", "1");
    expect(item("street")).toHaveAttribute("aria-setsize", "2");
    expect(item("name")).toHaveAttribute("aria-posinset", "2");
    expect(item("name")).toHaveAttribute("aria-setsize", "3");
    expect(item("lat")).toHaveAttribute("aria-level", "3");
    expect(item("ghost")).toHaveAttribute("aria-setsize", "1");
  });

  it("shows the empty label when there are no rows", () => {
    renderPicker({ rows: [], emptyLabel: "No field list yet" });

    expect(screen.getByText("No field list yet")).toBeInTheDocument();
    expect(screen.queryByRole("tree")).toBeNull();
  });
});

describe("TreePicker — expansion", () => {
  it("collapses a container from its chevron and expands it again", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: "Collapse address" }));
    expect(items()).toEqual(["address", "name", "tags", "ghost"]);

    await user.click(screen.getByRole("button", { name: "Expand address" }));
    expect(items()).toEqual(["address", "street", "geo", "lat", "name", "tags", "ghost"]);
  });

  it("is controlled when expanded is given", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    renderPicker({ expanded: new Set(), onExpandedChange });

    expect(items()).toEqual(["address", "name", "tags", "ghost"]);
    await user.click(screen.getByRole("button", { name: "Expand address" }));

    expect(onExpandedChange).toHaveBeenCalledWith(new Set(["address"]));
    expect(items()).toEqual(["address", "name", "tags", "ghost"]);
  });
});

describe("TreePicker — keyboard", () => {
  it("moves focus with the arrows over visible rows only, and picks with Enter and Space", async () => {
    const user = userEvent.setup();
    // The search box is a tab stop of its own, ahead of the tree.
    const { onPick } = renderPicker({ search: false });

    await user.tab();
    expect(item("address")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(item("address")).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowDown}");
    expect(item("name")).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onPick).toHaveBeenLastCalledWith(expect.objectContaining({ id: "name" }));
    await user.keyboard("{ArrowUp}{ArrowRight}");
    expect(item("address")).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowRight}");
    expect(item("street")).toHaveFocus();
    await user.keyboard(" ");
    expect(onPick).toHaveBeenLastCalledWith(expect.objectContaining({ id: "street" }));
    await user.keyboard("{End}");
    expect(item("ghost")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(item("address")).toHaveFocus();
  });

  it("is one tab stop plus the focused row's own actions: Tab then leaves the tree", async () => {
    const user = userEvent.setup();
    const rows = ROWS.map((r) =>
      r.id === "address" || r.id === "name"
        ? { ...r, actions: <button type="button">Unpair {r.id}</button> }
        : r
    );
    render(
      <>
        <TreePicker rows={rows} onPick={vi.fn()} label="Source" search={false} />
        <button type="button">after</button>
      </>
    );

    await user.tab();
    expect(item("address")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Unpair address" })).toHaveFocus();
    // The other rows' actions are mounted but inert, so a browser's Tab skips them;
    // jsdom does not model inert, so the attribute is what is checked.
    expect(screen.getByRole("button", { name: "Unpair address" }).closest("[inert]")).toBeNull();
    expect(screen.getByRole("button", { name: "Unpair name" }).closest("[inert]")).not.toBeNull();
  });

  it("keeps a row's actions mounted while the pointer moves onto them", async () => {
    const user = userEvent.setup();
    const unlink = vi.fn();
    const rows = ROWS.map((r) =>
      r.id === "name" ? { ...r, actions: <button type="button" onClick={unlink}>Unpair name</button> } : r
    );
    renderPicker({ rows, search: false });

    await user.hover(item("name"));
    await user.click(screen.getByRole("button", { name: "Unpair name" }));
    expect(unlink).toHaveBeenCalled();
  });

  it("keeps focus in the tree, on the nearest row, when the focused row leaves the list", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <TreePicker rows={ROWS} onPick={vi.fn()} label="Source" search={false} />
    );

    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(item("street")).toHaveFocus();

    rerender(
      <TreePicker
        rows={ROWS.filter((r) => r.id !== "street")}
        onPick={vi.fn()}
        label="Source"
        search={false}
      />
    );

    expect(item("geo")).toHaveFocus();
  });
});

describe("TreePicker — picking", () => {
  it("picks a dim row but never a group row, which is no tab stop", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    await user.click(screen.getByText("Not in the schema"));
    expect(onPick).not.toHaveBeenCalled();
    await user.click(item("ghost"));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: "ghost", dim: true }));
  });

  it("renders a row's actions and keeps a click on them from picking the row", async () => {
    const user = userEvent.setup();
    const unlink = vi.fn();
    const rows = ROWS.map((r) =>
      r.id === "address"
        ? { ...r, actions: <button type="button" onClick={unlink}>Unpair</button> }
        : r
    );
    const { onPick } = renderPicker({ rows });

    await user.click(screen.getByRole("button", { name: "Unpair" }));
    expect(unlink).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });
});

describe("TreePicker — search", () => {
  function Searchable() {
    const [query, setQuery] = useState("");
    return (
      <TreePicker
        rows={ROWS}
        onPick={vi.fn()}
        label="Source"
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Find a field…"
      />
    );
  }

  it("filters on the query, keeping a match's ancestors, and restores the expansion when cleared", async () => {
    const user = userEvent.setup();
    render(<Searchable />);

    await user.click(screen.getByRole("button", { name: "Collapse geo" }));
    expect(items()).toEqual(["address", "street", "geo", "name", "tags", "ghost"]);

    const box = screen.getByRole("searchbox", { name: "Search Source" });
    expect(box).toHaveAttribute("placeholder", "Find a field…");
    await user.type(box, "lat");
    expect(items()).toEqual(["address", "geo", "lat"]);

    await user.clear(box);
    expect(items()).toEqual(["address", "street", "geo", "name", "tags", "ghost"]);
  });

  it("shows no chevron under a query, and the keys leave the stored expansion alone", async () => {
    const user = userEvent.setup();
    render(<Searchable />);

    const box = screen.getByRole("searchbox", { name: "Search Source" });
    await user.type(box, "ge");
    expect(items()).toEqual(["address", "geo"]);
    expect(item("geo")).not.toHaveAttribute("aria-expanded");
    expect(item("address")).not.toHaveAttribute("aria-expanded");
    expect(screen.queryByRole("button", { name: /address|geo/ })).toBeNull();

    item("address").focus();
    await user.keyboard("{ArrowLeft}{ArrowRight}");
    await user.clear(box);
    expect(items()).toEqual(["address", "street", "geo", "lat", "name", "tags", "ghost"]);
  });

  it("keeps its own query when uncontrolled, and hides the box with search off", async () => {
    const user = userEvent.setup();
    const { unmount } = renderPicker();

    await user.type(screen.getByRole("searchbox", { name: "Search Source" }), "tags");
    expect(items()).toEqual(["tags"]);
    unmount();

    renderPicker({ search: false });
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
