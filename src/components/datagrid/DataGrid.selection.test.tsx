import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridProps } from "./DataGrid";
import type { WithMeta } from "./types/column";

type Row = { id: number; name: string; team: string };

/** Six rows over two teams, so a page of two is visibly smaller than a group. */
const ROWS: Row[] = [
  { id: 1, name: "Ada", team: "red" },
  { id: 2, name: "Bo", team: "red" },
  { id: 3, name: "Cy", team: "red" },
  { id: 4, name: "Dee", team: "blue" },
  { id: 5, name: "Eli", team: "blue" },
  { id: 6, name: "Fay", team: "blue" },
];

const schema = z.object({ name: z.string(), team: z.string() });

const COLUMNS: WithMeta<Row, any>[] = [
  { accessorKey: "name", header: "Name", meta: { editor: "text" } },
  { accessorKey: "team", header: "Team" },
];

const renderGrid = (props: Partial<DataGridProps<Row, any>> = {}) =>
  render(
    <DataGrid<Row, any>
      title="Crew"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={ROWS}
      selectable
      {...props}
    />
  );

const names = (rows: Row[]) => rows.map((r) => r.name).sort();

/**
 * The header checkbox scopes itself to the rows actually on screen. Grouping renders the
 * whole sorted set and hides the pager, so reading the page-sliced model there selected
 * five rows out of the thirty in front of the user — and said "on this page" while doing
 * it.
 */
describe("select-all scope", () => {
  it("takes the page, and says so, while the grid is paged", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelectionChange = vi.fn();
    renderGrid({
      onSelectionChange,
      pagination: { enabled: true, initialState: { pageSize: 2 } },
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const header = screen.getByRole("checkbox", { name: /select all rows on this page/i });
    await user.click(header);

    await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
    const last = onSelectionChange.mock.lastCall![0] as Row[];
    expect(names(last)).toEqual(["Ada", "Bo"]);
  });

  it("takes every rendered row, and says so, while the grid is grouped", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelectionChange = vi.fn();
    renderGrid({
      onSelectionChange,
      // A page size the grouped body ignores — grouping replaces paging.
      pagination: { enabled: true, initialState: { pageSize: 2 } },
      groupOptions: [{ key: "team", label: "Team" }],
      defaultGroupBy: "team",
    });
    await waitFor(() =>
      expect(document.querySelector('th[scope="colgroup"]')).toBeTruthy()
    );

    const header = screen.getByRole("checkbox", { name: /select all rows$/i });
    await user.click(header);

    await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
    const last = onSelectionChange.mock.lastCall![0] as Row[];
    expect(names(last)).toEqual(["Ada", "Bo", "Cy", "Dee", "Eli", "Fay"]);
  });

  it("clears exactly what it selected", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelectionChange = vi.fn();
    renderGrid({
      onSelectionChange,
      pagination: { enabled: true, initialState: { pageSize: 2 } },
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const label = /select all rows on this page/i;
    await user.click(screen.getByRole("checkbox", { name: label }));
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: /unselect all rows on this page/i })
      ).toBeChecked()
    );

    await user.click(screen.getByRole("checkbox", { name: /unselect all rows on this page/i }));
    await waitFor(() =>
      expect(onSelectionChange.mock.lastCall![0]).toHaveLength(0)
    );
  });
});

/**
 * The footer renders the pager only for the ungrouped list view. With paging off — or in
 * the cards view — the selection count and its Clear had nowhere to live and bulk
 * selection became invisible.
 */
describe("the selection band without a pager", () => {
  const selectFirstRow = async (user: ReturnType<typeof userEvent.setup>) => {
    const boxes = screen.getAllByRole("checkbox", { name: "Select row" });
    await user.click(boxes[0]);
  };

  it("reports the selection when pagination is off", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ pagination: { enabled: false } });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    await selectFirstRow(user);

    const clear = await screen.findByRole("button", { name: /clear/i });
    expect(clear).toBeInTheDocument();
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();

    await user.click(clear);
    await waitFor(() =>
      expect(screen.queryByText(/1 selected/i)).not.toBeInTheDocument()
    );
  });

  it("reports the selection in the cards view", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({
      card: (r) => <span>{r.name}</span>,
      defaultView: "cards",
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await selectFirstRow(user);
    expect(await screen.findByText(/1 selected/i)).toBeInTheDocument();
  });

  it("stays out of the way while nothing is selected", async () => {
    renderGrid({ pagination: { enabled: false } });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
  });
});

/** A grid with no `selectable` must not grow a footer band of its own. */
describe("a grid that cannot be selected", () => {
  it("renders no selection band", async () => {
    renderGrid({ selectable: false, pagination: { enabled: false } });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    expect(
      screen.queryByRole("checkbox", { name: /select/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });
});

/** The header checkbox goes indeterminate for a partial page — not checked. */
describe("the header checkbox state", () => {
  it("is indeterminate while only part of the page is selected", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ pagination: { enabled: true, initialState: { pageSize: 3 } } });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const rowBoxes = screen.getAllByRole("checkbox", { name: "Select row" });
    await user.click(rowBoxes[0]);

    const header = screen.getByRole("checkbox", {
      name: /select all rows on this page/i,
    }) as HTMLInputElement;
    await waitFor(() => expect(header.indeterminate).toBe(true));
    expect(header.checked).toBe(false);
  });
});

/** The pill counts what is selected across pages, not just what is on screen. */
describe("the selection pill", () => {
  it("keeps counting a row after paging past it", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ pagination: { enabled: true, initialState: { pageSize: 2 } } });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]);
    await screen.findByText(/1 selected/i);

    await user.click(screen.getByRole("button", { name: /next page/i }));
    await waitFor(() => expect(screen.getByText("Cy")).toBeInTheDocument());
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();

    const header = screen.getByRole("checkbox", {
      name: /select all rows on this page/i,
    }) as HTMLInputElement;
    expect(header.checked).toBe(false);
    expect(header.indeterminate).toBe(false);
  });
});

/** Grouped select-all takes rows out of collapsed groups too — they are still rendered
    content, just folded away. */
describe("select-all with a collapsed group", () => {
  it("still covers the rows inside it", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelectionChange = vi.fn();
    renderGrid({
      onSelectionChange,
      groupOptions: [{ key: "team", label: "Team" }],
      defaultGroupBy: "team",
    });
    await waitFor(() =>
      expect(document.querySelector('th[scope="colgroup"]')).toBeTruthy()
    );

    // The collapse has to actually happen, or the assertion below proves nothing.
    const redRows = () => screen.queryAllByText(/^(Ada|Bo|Cy)$/);
    expect(redRows().length).toBe(3);
    await user.click(screen.getByRole("button", { name: /^red, 3 rows$/i }));
    await waitFor(() => expect(redRows().length).toBe(0));

    await user.click(screen.getByRole("checkbox", { name: /select all rows$/i }));
    await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
    expect(onSelectionChange.mock.lastCall![0]).toHaveLength(6);
  });
});

/** Sanity: the injected select column does not disturb the leaf-column arithmetic the
    colgroup and every colSpan are built from. */
describe("the select column and the table's own geometry", () => {
  it("adds exactly one leaf column and one <col>", async () => {
    const { rerender } = render(
      <DataGrid<Row, any>
        title="Crew"
        columns={COLUMNS}
        zodSchema={schema as never}
        initialData={ROWS}
      />
    );
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    const headersWithout = document.querySelectorAll("thead tr:first-child th").length;
    const colsWithout = document.querySelectorAll("colgroup col").length;

    rerender(
      <DataGrid<Row, any>
        title="Crew"
        columns={COLUMNS}
        zodSchema={schema as never}
        initialData={ROWS}
        selectable
      />
    );
    await waitFor(() =>
      expect(screen.getAllByRole("checkbox", { name: "Select row" }).length).toBeGreaterThan(0)
    );

    expect(document.querySelectorAll("thead tr:first-child th").length).toBe(
      headersWithout + 1
    );
    expect(document.querySelectorAll("colgroup col").length).toBe(colsWithout + 1);

    // Every body row carries one cell per <col>, or the columns shear apart.
    const dataRow = screen
      .getAllByRole("row")
      .find((r) => within(r).queryAllByRole("cell").length > 0)!;
    expect(within(dataRow).getAllByRole("cell")).toHaveLength(colsWithout + 1);
  });
});

/**
 * Rows carrying no `id` or `uuid`, with no `idAccessor` to fall back on. The grid keys
 * these by object reference, and the checkbox cells, the selection set and the callback
 * must all agree on that key — a disagreement is silent, ticking the box and reporting an
 * empty selection to the consumer.
 */
describe("rows the consumer gave no id", () => {
  type Bare = { name: string };
  const BARE: Bare[] = [{ name: "Ada" }, { name: "Bo" }, { name: "Cy" }];
  const bareColumns: WithMeta<Bare, any>[] = [
    { accessorKey: "name", header: "Name" },
  ];

  const renderBare = (onSelectionChange: (rows: Bare[]) => void) =>
    render(
      <DataGrid<Bare, any>
        title="Bare"
        columns={bareColumns}
        zodSchema={z.object({ name: z.string() }) as never}
        initialData={BARE}
        selectable
        onSelectionChange={onSelectionChange}
      />
    );

  it("reports the row it ticked, not an empty selection", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelectionChange = vi.fn();
    renderBare(onSelectionChange);
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[1]);

    await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
    expect(onSelectionChange.mock.lastCall![0]).toEqual([{ name: "Bo" }]);
  });

  it("ticks one box rather than all of them", async () => {
    const user = userEvent.setup({ delay: null });
    renderBare(vi.fn());
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const boxes = () =>
      screen.getAllByRole("checkbox", { name: "Select row" }) as HTMLInputElement[];
    await user.click(boxes()[0]);

    await waitFor(() => expect(boxes()[0].checked).toBe(true));
    expect(boxes().filter((b) => b.checked)).toHaveLength(1);
  });
});

/**
 * The chevron and the label are what a user aims at. The collapse lives on the
 * surrounding row, so the button has to toggle and then stop the event — passing it up
 * would let the row's handler collapse the group straight back.
 */
describe("collapsing a group from its header control", () => {
  const renderGrouped = () =>
    renderGrid({ groupOptions: [{ key: "team", label: "Team" }], defaultGroupBy: "team" });

  it("toggles on a click on the header button, exactly once", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrouped();
    await waitFor(() =>
      expect(document.querySelector('th[scope="colgroup"]')).toBeTruthy()
    );

    const redRows = () => screen.queryAllByText(/^(Ada|Bo|Cy)$/);
    const toggle = () => screen.getByRole("button", { name: /^red, 3 rows$/i });
    expect(redRows().length).toBe(3);

    await user.click(toggle());
    await waitFor(() => expect(redRows().length).toBe(0));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");

    // Back open: a second toggle proves the row handler is not also firing.
    await user.click(toggle());
    await waitFor(() => expect(redRows().length).toBe(3));
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
  });

  it("still toggles from the keyboard", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrouped();
    await waitFor(() =>
      expect(document.querySelector('th[scope="colgroup"]')).toBeTruthy()
    );

    const redRows = () => screen.queryAllByText(/^(Ada|Bo|Cy)$/);
    screen.getByRole("button", { name: /^red, 3 rows$/i }).focus();
    // A native button raises a click from Enter — no key handler of its own, which would
    // toggle a second time on top of it.
    await user.keyboard("{Enter}");
    await waitFor(() => expect(redRows().length).toBe(0));
  });
});
