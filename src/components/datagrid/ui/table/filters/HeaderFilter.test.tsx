import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridProps } from "../../../DataGrid";
import type { WithMeta } from "../../../types/column";

/**
 * The filter row is dispatched one component per `meta.filter.type`. Each kind owns its
 * own control, its own value shape and — for text — its own debounce, so each needs its
 * own scenario: the shapes have nothing in common but the column they write to.
 */

type Row = {
  id: number;
  name: string;
  role: string;
  active: boolean;
  joined: string;
};

const ROWS: Row[] = [
  { id: 1, name: "Ada", role: "admin", active: true, joined: "2026-01-15" },
  { id: 2, name: "Bo", role: "editor", active: false, joined: "2026-03-02" },
  { id: 3, name: "Cy", role: "admin", active: true, joined: "2026-06-20" },
];

const schema = z.object({
  name: z.string(),
  role: z.string(),
  active: z.boolean(),
  joined: z.string(),
});

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
];

const COLUMNS: WithMeta<Row, any>[] = [
  {
    accessorKey: "name",
    header: "Name",
    meta: { label: "Name", filter: { type: "text", debounceMs: 10 } },
  },
  {
    accessorKey: "role",
    header: "Role",
    meta: { label: "Role", filter: { type: "select", options: ROLE_OPTIONS } },
  },
  {
    accessorKey: "active",
    header: "Active",
    meta: { label: "Active", filter: { type: "boolean" } },
  },
  {
    accessorKey: "joined",
    header: "Joined",
    meta: { label: "Joined", filter: { type: "dateRange" } },
  },
];

const renderGrid = (props: Partial<DataGridProps<Row, any>> = {}) =>
  render(
    <DataGrid<Row, any>
      title="Crew"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={ROWS}
      {...props}
    />
  );

/** Opens the toolbar overflow menu and turns the filter row on. */
async function showFilterRow(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: /filters, columns and grouping/i })
  );
  await user.click(screen.getByRole("switch", { name: /filter row/i }));
  await screen.findByRole("textbox", { name: /filter by name/i });
  // Close the menu so it stops covering the grid for the rest of the test.
  await user.keyboard("{Escape}");
}

const visibleNames = () =>
  ROWS.map((r) => r.name).filter((n) => screen.queryByText(n) !== null);

describe("the filter row, per kind", () => {
  it("filters on typed text once the debounce settles", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await showFilterRow(user);

    await user.type(screen.getByRole("textbox", { name: /filter by name/i }), "ad");
    await waitFor(() => expect(visibleNames()).toEqual(["Ada"]));
  });

  it("puts the rows back when the text is cleared", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await showFilterRow(user);

    const box = screen.getByRole("textbox", { name: /filter by name/i });
    await user.type(box, "ad");
    await waitFor(() => expect(visibleNames()).toEqual(["Ada"]));

    await user.clear(box);
    await waitFor(() => expect(visibleNames()).toEqual(["Ada", "Bo", "Cy"]));
  });

  it("matches a select option exactly", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await showFilterRow(user);

    await user.selectOptions(
      screen.getByRole("combobox", { name: /filter by role/i }),
      "editor"
    );
    await waitFor(() => expect(visibleNames()).toEqual(["Bo"]));
  });

  it("goes back to Any on the select's placeholder", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await showFilterRow(user);

    const select = screen.getByRole("combobox", { name: /filter by role/i });
    await user.selectOptions(select, "editor");
    await waitFor(() => expect(visibleNames()).toEqual(["Bo"]));

    await user.selectOptions(select, "");
    await waitFor(() => expect(visibleNames()).toEqual(["Ada", "Bo", "Cy"]));
  });

  /* `false` is a meaningful filter value, so "No" must survive the auto-remove that
     drops every other falsy filter. */
  it("keeps the No selection on a boolean filter", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await showFilterRow(user);

    const select = screen.getByRole("combobox", { name: /filter by active/i });
    await user.selectOptions(select, "false");
    await waitFor(() => expect(visibleNames()).toEqual(["Bo"]));

    await user.selectOptions(select, "true");
    await waitFor(() => expect(visibleNames()).toEqual(["Ada", "Cy"]));
  });

  it("filters a date range inclusively on both ends", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await showFilterRow(user);

    const from = screen.getByLabelText(/filter by joined, from/i);
    const to = screen.getByLabelText(/filter by joined, to/i);

    await user.type(from, "2026-03-02");
    await waitFor(() => expect(visibleNames()).toEqual(["Bo", "Cy"]));

    // The upper bound is the boundary row's own day — inclusive, not exclusive.
    await user.type(to, "2026-03-02");
    await waitFor(() => expect(visibleNames()).toEqual(["Bo"]));
  });

  it("filters on any of the options a multi-select holds", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({
      columns: COLUMNS.map((c) =>
        c.header === "Role"
          ? {
              ...c,
              meta: {
                ...c.meta,
                filter: { type: "select", options: ROLE_OPTIONS, multi: true },
              },
            }
          : c
      ) as WithMeta<Row, any>[],
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await showFilterRow(user);

    const list = screen.getByRole("listbox", { name: /filter by role/i });
    await user.selectOptions(list, ["editor"]);
    await waitFor(() => expect(visibleNames()).toEqual(["Bo"]));

    await user.selectOptions(list, ["admin", "editor"]);
    await waitFor(() => expect(visibleNames()).toEqual(["Ada", "Bo", "Cy"]));
  });
});

describe("clearing filters from outside the row", () => {
  it("empties the text control the row is showing", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await showFilterRow(user);

    const box = screen.getByRole("textbox", { name: /filter by name/i });
    await user.type(box, "ad");
    await waitFor(() => expect(visibleNames()).toEqual(["Ada"]));

    // "Clear all" lives in the overflow menu, which the click on the filter row closed.
    await user.click(
      screen.getByRole("button", { name: /filters, columns and grouping/i })
    );
    await user.click(await screen.findByRole("button", { name: /clear all/i }));

    await waitFor(() => expect(visibleNames()).toEqual(["Ada", "Bo", "Cy"]));
    // The control has to follow the column it mirrors, or it shows a term that is no
    // longer applied — and re-applies it on the next keystroke.
    expect(
      (screen.getByRole("textbox", { name: /filter by name/i }) as HTMLInputElement).value
    ).toBe("");
  });

  it("leaves the page where it was", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ pagination: { enabled: true, initialState: { pageSize: 1 } } });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /next page/i }));
    const pager = screen.getByRole("navigation");
    expect(within(pager).getByRole("button", { current: "page" })).toHaveTextContent("2");

    await showFilterRow(user);
    // Only mounting the row: no term has been entered, so nothing was filtered and the
    // user must still be looking at page 2.
    expect(within(pager).getByRole("button", { current: "page" })).toHaveTextContent("2");
  });
});

/**
 * Each kind is its own component so its hooks run unconditionally. Behind `if` branches
 * in one function, a column whose filter kind changed at runtime crashed with "rendered
 * fewer hooks than expected".
 */
describe("a filter kind that changes at runtime", () => {
  it("swaps the control without tearing down the grid", async () => {
    const user = userEvent.setup({ delay: null });
    const { rerender } = renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await showFilterRow(user);
    expect(screen.getByRole("textbox", { name: /filter by name/i })).toBeVisible();

    const swapped = COLUMNS.map((c) =>
      c.header === "Name"
        ? {
            ...c,
            meta: {
              ...c.meta,
              // A label no cell carries, so the assertions below can tell the option
              // apart from the row it would match.
              filter: {
                type: "select",
                options: [{ value: "Ada", label: "Ada only" }],
              },
            },
          }
        : c
    ) as WithMeta<Row, any>[];

    rerender(
      <DataGrid<Row, any>
        title="Crew"
        columns={swapped}
        zodSchema={schema as never}
        initialData={ROWS}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: /filter by name/i })).toBeVisible()
    );
    expect(
      screen.queryByRole("textbox", { name: /filter by name/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });
});
