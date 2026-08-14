import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridProps } from "./DataGrid";
import type { WithMeta } from "./types/column";

type Row = { id: number; name: string; email: string; note: string };

const ROWS: Row[] = [
  { id: 1, name: "Ada", email: "ada@example.com", note: "first" },
  { id: 2, name: "Bo", email: "bo@example.com", note: "second" },
];

const schema = z.object({ name: z.string(), email: z.string(), note: z.string() });

const COLUMNS: WithMeta<Row, any>[] = [
  { accessorKey: "name", header: "Name", meta: { filter: { type: "text" } } },
  {
    accessorKey: "email",
    header: "Email",
    meta: { hideOnMobile: true, filter: { type: "text" } },
  },
  { accessorKey: "note", header: "Note", meta: { filter: { type: "text" } } },
];

/**
 * A `matchMedia` jsdom does not ship. `matches` is read on every render, so it has to
 * answer from live state rather than a value captured at install time.
 */
let narrow = false;
const listeners = new Set<() => void>();

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      // Only the grid's own below-md query is answered; anything else stays wide.
      get matches() {
        return query.includes("max-width") ? narrow : false;
      },
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      addListener: (cb: () => void) => listeners.add(cb),
      removeListener: (cb: () => void) => listeners.delete(cb),
      dispatchEvent: () => false,
      onchange: null,
    }),
  });
}

/** Flips the viewport and notifies the subscribers, the way a real resize would. */
const setNarrow = (value: boolean) =>
  act(() => {
    narrow = value;
    listeners.forEach((cb) => cb());
  });

afterEach(() => {
  narrow = false;
  listeners.clear();
});

const renderGrid = (props: Partial<DataGridProps<Row, any>> = {}) => {
  installMatchMedia();
  return render(
    <DataGrid<Row, any>
      title="People"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={ROWS}
      {...props}
    />
  );
};

const headerCells = () =>
  [...document.querySelectorAll("thead tr:first-child th")];
const colCount = () => document.querySelectorAll("colgroup col").length;
const dataRows = () =>
  screen.getAllByRole("row").filter((r) => within(r).queryAllByRole("cell").length > 0);

const openOverflowMenu = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: /filters, columns and grouping/i }));

/**
 * `hideOnMobile` is driven through column visibility rather than a `display:none` class.
 * A hidden cell still occupies a `<col>`, which shifts every following cell onto the
 * wrong width under `table-fixed`, and the class has to be repeated on the filter row,
 * the group header and the skeleton or those rows carry one cell more than the data rows.
 */
describe("hideOnMobile", () => {
  it("keeps the column while the viewport is wide", async () => {
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(headerCells()).toHaveLength(colCount());
  });

  it("drops the column below md", async () => {
    narrow = true;
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /email/i })
    ).not.toBeInTheDocument();
  });

  /* The whole point of going through the column model: every row that spans the table
     has to agree on the count, or the columns shear apart below md. */
  it("keeps the colgroup, the header and the data rows on the same count", async () => {
    narrow = true;
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const cols = colCount();
    expect(headerCells()).toHaveLength(cols);
    for (const row of dataRows()) {
      expect(within(row).getAllByRole("cell")).toHaveLength(cols);
    }
  });

  it("keeps the filter row on the same count", async () => {
    const user = userEvent.setup({ delay: null });
    narrow = true;
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await openOverflowMenu(user);
    await user.click(screen.getByRole("switch", { name: /filter row/i }));
    await screen.findByRole("textbox", { name: /filter by name/i });

    const filterRow = [...document.querySelectorAll("thead tr")].at(-1)!;
    expect(filterRow.children).toHaveLength(colCount());
    // The hidden column's control is gone with it, rather than shifting the row along.
    expect(
      screen.queryByRole("textbox", { name: /filter by email/i })
    ).not.toBeInTheDocument();
  });

  it("brings the column back when the viewport widens again", async () => {
    narrow = true;
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();

    setNarrow(false);
    await waitFor(() =>
      expect(screen.getByText("ada@example.com")).toBeInTheDocument()
    );
    expect(headerCells()).toHaveLength(colCount());
  });

  /* The viewport layer is never written to storage, so widening the window must not
     leave the column hidden as if the user had chosen that. */
  it("does not persist the mobile hide as a user preference", async () => {
    const user = userEvent.setup({ delay: null });
    narrow = true;
    renderGrid({ storageKey: "dg:responsive" });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    // A real preference change, so something IS written — the question is what.
    await openOverflowMenu(user);
    // The trigger carries a count badge, so its name is "Columns" plus a number.
    await user.click(screen.getByRole("button", { name: /^Columns/ }));
    const panel = await screen.findByRole("dialog", { name: "Columns" });
    await user.click(within(panel).getByRole("checkbox", { name: /note/i }));

    await waitFor(() =>
      expect(localStorage.getItem("dg:responsive")).not.toBeNull()
    );
    const stored = JSON.parse(localStorage.getItem("dg:responsive")!);
    expect(stored.columnVisibility).toHaveProperty("note", false);
    // The viewport's own layer would otherwise outlive the narrow window it came from.
    expect(stored.columnVisibility).not.toHaveProperty("email");
  });
});

/**
 * The Columns popover lists the same column model, so a viewport-hidden column appears
 * there as an unchecked, toggleable entry the user cannot actually reveal.
 */
describe("the Columns popover below md", () => {
  it("does not offer a control that refuses to work", async () => {
    const user = userEvent.setup({ delay: null });
    narrow = true;
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await openOverflowMenu(user);
    await user.click(screen.getByRole("button", { name: /^Columns/ }));
    const panel = await screen.findByRole("dialog", { name: "Columns" });

    const box = within(panel).queryByRole("checkbox", { name: /email/i });
    /* Either the entry is left out while the viewport owns it, or it is shown
       disabled — but never as a live control that reports "hidden" and then refuses
       to change it. */
    expect(box === null || (box as HTMLInputElement).disabled).toBe(true);
  });
});

/**
 * A viewport-hidden column keeps its slot in `columnOrder` while it is out of the
 * popover's list. `move` swaps within the movable subset and stitches back into the full
 * order, so the two lists must stay consistent — a mismatch writes `undefined` into
 * `columnOrder` and drops a column off the table.
 */
describe("reordering while a column is viewport-hidden", () => {
  /* The consumer's own columns, in render order. The injected `__select__` and
     `__actions__` cells are excluded by id — `__actions__` paints at zero width but does
     carry an accessible name, so filtering on empty text would not exclude it. */
  const headerNames = () =>
    [...document.querySelectorAll<HTMLElement>("thead tr:first-child th[data-col-id]")]
      .filter((th) => !th.dataset.colId?.startsWith("__"))
      .map((th) => (th.textContent ?? "").trim());

  const openColumnsPanel = async (user: ReturnType<typeof userEvent.setup>) => {
    await openOverflowMenu(user);
    await user.click(screen.getByRole("button", { name: /^Columns/ }));
    return screen.findByRole("dialog", { name: "Columns" });
  };

  it("moves the visible columns and leaves the hidden one's slot alone", async () => {
    const user = userEvent.setup({ delay: null });
    narrow = true;
    renderGrid({ storageKey: "dg:reorder" });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    expect(headerNames()).toEqual(["Name", "Note"]);

    const panel = await openColumnsPanel(user);
    // The hidden column is not in the list, so it cannot be the one being moved.
    expect(within(panel).queryByText("Email")).not.toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: /move note earlier/i }));

    await waitFor(() => expect(headerNames()).toEqual(["Note", "Name"]));

    /* Nothing was dropped or duplicated. A `movable` list that disagreed with the full
       order writes `undefined` into the slots it stitches, which is what this catches. */
    await waitFor(() => expect(localStorage.getItem("dg:reorder")).not.toBeNull());
    const order: unknown[] = JSON.parse(localStorage.getItem("dg:reorder")!).columnOrder;
    expect(order.every((id) => typeof id === "string" && id !== "")).toBe(true);
    expect(new Set(order).size).toBe(order.length);
    expect(order).toEqual(expect.arrayContaining(["email", "name", "note"]));
  });

  it("gives the hidden column back in its own place when the viewport widens", async () => {
    const user = userEvent.setup({ delay: null });
    narrow = true;
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const panel = await openColumnsPanel(user);
    await user.click(within(panel).getByRole("button", { name: /move note earlier/i }));
    await waitFor(() => expect(headerNames()).toEqual(["Note", "Name"]));

    setNarrow(false);
    // Email held the slot it was declared in, between the two columns that moved.
    await waitFor(() => expect(headerNames()).toEqual(["Note", "Email", "Name"]));
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("still refuses to hide the last column standing", async () => {
    const user = userEvent.setup({ delay: null });
    narrow = true;
    renderGrid({
      columns: [COLUMNS[0], COLUMNS[1]],
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const panel = await openColumnsPanel(user);
    // Email is the viewport's, so Name is the only column the user has left.
    expect(within(panel).getByRole("checkbox", { name: /name/i })).toBeDisabled();
  });

  it("keeps the trigger's badge counting only what the user hid", async () => {
    const user = userEvent.setup({ delay: null });
    narrow = true;
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await openOverflowMenu(user);
    // No badge: the user has hidden nothing, whatever the viewport is doing.
    expect(screen.getByRole("button", { name: "Columns" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Columns" }));
    const panel = await screen.findByRole("dialog", { name: "Columns" });
    await user.click(within(panel).getByRole("checkbox", { name: /note/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Columns1" })).toBeInTheDocument()
    );
  });
});
