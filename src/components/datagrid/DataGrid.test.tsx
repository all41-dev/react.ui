import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridHandle, type DataGridProps } from "./DataGrid";
import type { WithMeta } from "./types/column";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

type User = {
  id: number;
  name: string;
  role: string;
  active: boolean;
  joined: string;
};

const USERS: User[] = [
  { id: 1, name: "Leanne", role: "admin", active: true, joined: "2026-01-15" },
  { id: 2, name: "Ervin", role: "inactive", active: false, joined: "2026-03-02" },
  { id: 3, name: "Clementine", role: "active", active: true, joined: "2026-06-20" },
  { id: 4, name: "Patricia", role: "editor", active: false, joined: "2026-08-01" },
];

const schema = z.object({
  name: z.string().min(1),
  role: z.string(),
  active: z.boolean(),
  joined: z.string(),
});

const COLUMNS: WithMeta<User, any>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
  {
    accessorKey: "role",
    header: "Role",
    meta: {
      label: "Role",
      editor: "text",
      // The exact pair from the review's repro: "active" as an option value, with
      // "inactive" also present in the data.
      filter: {
        type: "select",
        options: [
          { value: "admin", label: "Admin" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "editor", label: "Editor" },
        ],
      },
    },
  },
];

function renderGrid(props: Partial<DataGridProps<User, any>> = {}) {
  return render(
    <DataGrid<User, any>
      title="Users"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={USERS}
      {...props}
    />
  );
}

/**
 * ARIA roles whose descendants browsers prune from the accessibility tree. A container
 * that holds its own controls must never carry one.
 */
const PRESENTATIONAL_CHILDREN_ROLES = [
  "button",
  "checkbox",
  "img",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "progressbar",
  "radio",
  "scrollbar",
  "separator",
  "slider",
  "switch",
  "tab",
];

/** Data rows only — group headers and padding rows are also `<tr>`s. */
const dataRows = () =>
  screen.getAllByRole("row").filter((r) => within(r).queryAllByRole("cell").length > 0);

const visibleLeafCount = () =>
  document.querySelectorAll("thead tr:first-child th").length;

/**
 * Filters, Columns, Group-by and Refresh live behind the toolbar's overflow menu, so a
 * test has to open it before reaching any of them.
 */
const openOverflowMenu = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: /filters, columns and grouping/i }));

/* ------------------------------------------------------------------ */

describe("DataGrid", () => {
  it("renders its rows", async () => {
    renderGrid();
    await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());
    expect(screen.getByText("Clementine")).toBeInTheDocument();
  });

  describe("column filters match their declared kind", () => {
    it("a select filter matches exactly, not as a substring", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await openOverflowMenu(user);
      await user.click(screen.getByRole("switch", { name: /filter row/i }));
      const select = await screen.findByRole("combobox", {
        name: "Filter by Role",
      });
      await user.selectOptions(select, "active");

      await waitFor(() =>
        expect(screen.queryByText("Ervin")).not.toBeInTheDocument()
      );
      // A substring match would let "Active" also match "Inactive".
      expect(screen.getByText("Clementine")).toBeInTheDocument();
      expect(screen.queryByText("Leanne")).not.toBeInTheDocument();
    });
  });

  describe("the search bar holds the active criteria", () => {
    /** Applies the Role=Active column filter through the toolbar. */
    const applyRoleFilter = async (user: ReturnType<typeof userEvent.setup>) => {
      await openOverflowMenu(user);
      await user.click(screen.getByRole("switch", { name: /filter row/i }));
      await user.selectOptions(
        await screen.findByRole("combobox", { name: "Filter by Role" }),
        "active"
      );
    };

    it("an active filter becomes a pill in the field, and its × clears it", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await applyRoleFilter(user);

      const clear = await screen.findByRole("button", { name: /clear role filter/i });
      // The pill lives inside the search field itself, not in a band of its own:
      // same wrapper as the input.
      const box = screen.getByRole("searchbox", { name: /search/i });
      const field = box.parentElement!;
      expect(field).toContainElement(clear);
      // The option's label, not the "active" the filter actually stores — the pill has to
      // name the criterion the way the control that set it does.
      expect(within(field).getByText("Active")).toBeInTheDocument();
      expect(within(field).queryByText("active")).not.toBeInTheDocument();

      await user.click(clear);
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());
      expect(
        screen.queryByRole("button", { name: /clear role filter/i })
      ).not.toBeInTheDocument();
    });

    it("Backspace in an empty field removes the last pill", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await applyRoleFilter(user);
      await screen.findByRole("button", { name: /clear role filter/i });

      await user.click(screen.getByRole("searchbox", { name: /search/i }));
      await user.keyboard("{Backspace}");

      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: /clear role filter/i })
        ).not.toBeInTheDocument()
      );
      expect(screen.getByText("Leanne")).toBeInTheDocument();
    });

    it("Backspace with text in the field edits the text instead", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await applyRoleFilter(user);
      const box = screen.getByRole("searchbox", { name: /search/i });
      await user.type(box, "ab{Backspace}");

      expect(box).toHaveValue("a");
      expect(
        screen.getByRole("button", { name: /clear role filter/i })
      ).toBeInTheDocument();
    });

    it("Clear all drops every column filter, and only shows while there is one", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await openOverflowMenu(user);
      // Nothing to clear yet, so the row isn't there to be clicked.
      expect(
        screen.queryByRole("button", { name: /clear all/i })
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("switch", { name: /filter row/i }));
      await user.selectOptions(
        await screen.findByRole("combobox", { name: "Filter by Role" }),
        "active"
      );

      // Setting the filter means clicking the header row, which is outside the panel —
      // so the panel closes, exactly as an outside click should.
      await openOverflowMenu(user);
      await user.click(await screen.findByRole("button", { name: /clear all/i }));

      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: /clear role filter/i })
        ).not.toBeInTheDocument()
      );
      expect(screen.getByText("Leanne")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /clear all/i })
      ).not.toBeInTheDocument();
    });

    it("the overflow menu stays open while criteria are applied", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await openOverflowMenu(user);
      const filterRow = screen.getByRole("switch", { name: /filter row/i });
      await user.click(filterRow);

      // Stacking criteria used to mean reopening the menu for each one.
      expect(screen.getByRole("switch", { name: /filter row/i })).toBeInTheDocument();

      await user.keyboard("{Escape}");
      await waitFor(() =>
        expect(
          screen.queryByRole("switch", { name: /filter row/i })
        ).not.toBeInTheDocument()
      );
    });

    it("the trigger promises a dialog and the panel is an exposed one", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      const trigger = screen.getByRole("button", {
        name: /filters, columns and grouping/i,
      });
      // `aria-haspopup="true"` means exactly "menu" — and this panel is not one.
      expect(trigger).toHaveAttribute("aria-haspopup", "dialog");

      await user.click(trigger);
      // Without a role the panel's aria-label is dropped (generic elements expose no
      // name), so this query is the whole finding: role + name, together.
      expect(
        screen.getByRole("dialog", { name: "More options" })
      ).toBeInTheDocument();
    });

    it("the Group-by radios are one tab stop and arrows move the selection", async () => {
      const user = userEvent.setup();
      renderGrid({ groupOptions: [{ key: "role", label: "Role" }] });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await openOverflowMenu(user);
      // Roving tabindex: exactly one radio (the checked one — "None") is tabbable.
      const radios = screen.getAllByRole("radio");
      expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1"]);

      radios[0].focus();
      await user.keyboard("{ArrowDown}");

      // Selection follows focus, as in a native radio group — and the tab stop roves.
      await waitFor(() =>
        expect(screen.getAllByRole("radio")[1]).toHaveAttribute("aria-checked", "true")
      );
      expect(screen.getAllByRole("radio")[1]).toHaveFocus();
      expect(screen.getAllByRole("radio")[0]).toHaveAttribute("tabindex", "-1");

      // The selection is real: grouping by Role puts group headers in the table.
      await waitFor(() =>
        expect(document.querySelector('th[scope="colgroup"]')).toBeTruthy()
      );
    });
  });

  describe("empty state comes from the filtered model", () => {
    it("distinguishes no-results from no-data and offers a way back", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await user.type(
        screen.getByRole("searchbox", { name: /search/i }),
        "zzz-nothing"
      );

      // Previously the body just went blank: `rows` was the unfiltered array, so the
      // empty state was suppressed while the virtualizer yielded nothing.
      const empty = await screen.findByText(/no matching results/i);
      expect(empty).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /clear filters/i })
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /clear filters/i }));
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());
    });

    it("shows the plain empty state when there is genuinely no data", async () => {
      renderGrid({ initialData: [], emptyLabel: "No users" });
      expect(await screen.findByText("No users")).toBeInTheDocument();
      expect(screen.queryByText(/no matching results/i)).not.toBeInTheDocument();
    });
  });

  describe("row identity", () => {
    it("checking one row does not check them all", async () => {
      const user = userEvent.setup();
      renderGrid({ selectable: true });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      const boxes = screen.getAllByRole("checkbox", { name: "Select row" });
      expect(boxes.length).toBeGreaterThan(1);

      await user.click(boxes[0]);

      // Every row keyed to the string "undefined" before `id` was in the chain.
      const checked = screen
        .getAllByRole("checkbox", { name: "Select row" })
        .filter((b) => (b as HTMLInputElement).checked);
      expect(checked).toHaveLength(1);
    });

    it("reports the selected row objects to the consumer", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      renderGrid({ selectable: true, onSelectionChange });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]);
      await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
      expect(onSelectionChange.mock.lastCall?.[0]).toHaveLength(1);
    });

    it("re-announces the selection when a refetch replaces the row objects", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const view = renderGrid({ selectable: true, onSelectionChange });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]);
      await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
      expect(onSelectionChange.mock.lastCall?.[0]?.[0]?.name).toBe("Leanne");
      const callsBefore = onSelectionChange.mock.calls.length;

      // A parent refetch: same ids, but the selected row's object was replaced. The old
      // guard compared only the selection set, so the consumer kept the stale object.
      const refetched = USERS.map((u) =>
        u.id === 1 ? { ...u, name: "Leanne (renamed)" } : u
      );
      view.rerender(
        <DataGrid<User, any>
          title="Users"
          columns={COLUMNS}
          zodSchema={schema as never}
          initialData={refetched}
          selectable
          onSelectionChange={onSelectionChange}
        />
      );

      await waitFor(() =>
        expect(onSelectionChange.mock.calls.length).toBeGreaterThan(callsBefore)
      );
      expect(onSelectionChange.mock.lastCall?.[0]).toEqual([
        expect.objectContaining({ id: 1, name: "Leanne (renamed)" }),
      ]);
    });

    it("does not re-announce when a refetch returns the identical row objects", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const view = renderGrid({ selectable: true, onSelectionChange });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]);
      await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
      const callsBefore = onSelectionChange.mock.calls.length;

      // A new array of the same objects — the noise guard the fix promised to keep.
      view.rerender(
        <DataGrid<User, any>
          title="Users"
          columns={COLUMNS}
          zodSchema={schema as never}
          initialData={[...USERS]}
          selectable
          onSelectionChange={onSelectionChange}
        />
      );

      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());
      expect(onSelectionChange.mock.calls.length).toBe(callsBefore);
    });
  });

  describe("colSpan tracks the visible leaf columns", () => {
    it("the empty state spans exactly the rendered columns", async () => {
      renderGrid({ initialData: [], selectable: true });
      await waitFor(() =>
        expect(document.querySelector("tbody td[colspan]")).toBeTruthy()
      );
      const td = document.querySelector("tbody td[colspan]")!;
      expect(Number(td.getAttribute("colspan"))).toBe(visibleLeafCount());
    });
  });

  describe("controlled pagination needs both halves", () => {
    it("warns when `state` is passed without `onChange`", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderGrid({ pagination: { state: { pageIndex: 0, pageSize: 10 } } });
      await waitFor(() =>
        expect(
          warn.mock.calls.some((c) =>
            String(c[0]).includes("pagination.state")
          )
        ).toBe(true)
      );
    });

    it("says nothing when both are supplied", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderGrid({
        pagination: { state: { pageIndex: 0, pageSize: 10 }, onChange: vi.fn() },
      });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());
      expect(
        warn.mock.calls.some((c) => String(c[0]).includes("pagination.state"))
      ).toBe(false);
    });
  });

  describe("group header rows fit the table", () => {
    it("emits exactly one cell per leaf column, even when the first is an aggregate", async () => {
      const cols: WithMeta<User, any>[] = [
        // An aggregate in position 0 is the case that produced N+1 cells.
        { accessorKey: "id", header: "Id", meta: { agg: "sum" } },
        { accessorKey: "name", header: "Name" },
        { accessorKey: "role", header: "Role" },
      ];
      renderGrid({
        columns: cols,
        groupOptions: [{ key: "role", label: "Role" }],
        defaultGroupBy: "role",
      });

      await waitFor(() =>
        expect(document.querySelector('th[scope="colgroup"]')).toBeTruthy()
      );

      const leaf = visibleLeafCount();
      const headerRows = [...document.querySelectorAll("tr")].filter((r) =>
        r.querySelector('th[scope="colgroup"]')
      );
      expect(headerRows.length).toBeGreaterThan(0);
      for (const r of headerRows) {
        const cells = [...r.children].reduce(
          (n, c) => n + Number(c.getAttribute("colspan") ?? 1),
          0
        );
        expect(cells).toBe(leaf);
      }
    });
  });

  describe("the editing round-trip", () => {
    /** A price stored in cents, edited in whole units. */
    const priceCols: WithMeta<any, any>[] = [
      { accessorKey: "name", header: "Name", meta: { editor: "text" } },
      {
        accessorKey: "price",
        header: "Price",
        meta: {
          editor: "text",
          cellEdit: true,
          // Display only — this must never reach the editor.
          format: (v) => `${Number(v) / 100} €`,
          toForm: (v) => String(Number(v) / 100),
          fromForm: (v) => Math.round(Number(v) * 100),
        },
      },
    ];
    const priceSchema = z.object({
      name: z.string(),
      price: z.coerce.number(),
    });
    const priceRows = [{ id: 1, name: "Widget", price: 1250 }];

    it("seeds the cell editor from `toForm`, not `format`", async () => {
      const user = userEvent.setup();
      render(
        <DataGrid
          title="P"
          columns={priceCols}
          zodSchema={priceSchema as never}
          initialData={priceRows}
          onPersist={vi.fn(async (_m, v) => ({ ...priceRows[0], ...(v as object) }))}
        />
      );
      await waitFor(() => expect(screen.getByText(/Widget/)).toBeInTheDocument());

      // The cell-edit trigger's accessible name is the displayed (formatted) value.
      await user.click(screen.getByRole("button", { name: "12.5 €" }));
      const input = await screen.findByRole("textbox");
      // "12.5" from toForm — not "12.5 €" from format, which is what the old
      // computeDefaults would have put here.
      expect((input as HTMLInputElement).value).toBe("12.5");
    });

    it("applies `fromForm` and zod's transform before persisting", async () => {
      const user = userEvent.setup();
      const onPersist = vi.fn(async (_m: string, v: unknown) => ({
        ...priceRows[0],
        ...(v as object),
      }));
      render(
        <DataGrid
          title="P"
          columns={priceCols}
          zodSchema={priceSchema as never}
          initialData={priceRows}
          onPersist={onPersist as never}
        />
      );
      await waitFor(() => expect(screen.getByText(/Widget/)).toBeInTheDocument());

      // The cell-edit trigger's accessible name is the displayed (formatted) value.
      await user.click(screen.getByRole("button", { name: "12.5 €" }));
      const input = await screen.findByRole("textbox");
      await user.clear(input);
      await user.type(input, "20");
      await user.click(screen.getByRole("button", { name: /^save$/i }));

      await waitFor(() => expect(onPersist).toHaveBeenCalled());
      const [mode, values] = onPersist.mock.lastCall!;
      expect(mode).toBe("cell");
      // fromForm turned "20" into 2000, and zod's coercion produced a number —
      // Reading only `success` would send the untransformed string to the server.
      expect((values as { price: unknown }).price).toBe(2000);
      expect(typeof (values as { price: unknown }).price).toBe("number");
    });
  });

  describe("imperative handle", () => {
    it("opens and closes the editor through the ref", async () => {
      const ref = createRef<DataGridHandle<User>>();
      renderGrid({ ref, onPersist: vi.fn() });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      expect(ref.current?.isEditing()).toBe(false);

      // Replaces `cancelEditTrigger` — a number the parent had to bump.
      await waitFor(() => {
        ref.current?.startCreate();
      });
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(ref.current?.isEditing()).toBe(true);

      await waitFor(() => {
        ref.current?.cancelEdit();
      });
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      );
      expect(ref.current?.isEditing()).toBe(false);
    });

    it("cancelling never leaves the drawer open as a blank Create form", async () => {
      const ref = createRef<DataGridHandle<User>>();
      renderGrid({ ref, onPersist: vi.fn() });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await waitFor(() => ref.current?.startEdit(USERS[0]));
      expect(
        within(await screen.findByRole("dialog")).getByText("Edit")
      ).toBeInTheDocument();

      await waitFor(() => ref.current?.cancelEdit());
      // The old failure mode: `editing` cleared, `open` left true, so the drawer
      // re-rendered with mode "create" and no row.
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      );
      expect(screen.queryByText("Create")).not.toBeInTheDocument();
    });

    it("clears the selection through the ref", async () => {
      const user = userEvent.setup();
      const ref = createRef<DataGridHandle<User>>();
      renderGrid({ ref, selectable: true });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[0]);
      await waitFor(() => ref.current?.clearSelection());

      await waitFor(() =>
        expect(
          screen
            .getAllByRole("checkbox", { name: "Select row" })
            .filter((b) => (b as HTMLInputElement).checked)
        ).toHaveLength(0)
      );
    });
  });

  describe("accessibility", () => {
    it("the grid has a name and valid row semantics", async () => {
      renderGrid({ selectable: true });
      const grid = await screen.findByRole("grid", { name: "Users" });
      // The header row is row 1 of the grid, so the count includes it and the first
      // data row is row 2.
      expect(grid).toHaveAttribute("aria-rowcount", String(USERS.length + 1));
      expect(within(grid).getAllByRole("row")[0]).toHaveAttribute(
        "aria-rowindex",
        "1"
      );
      const rows = dataRows();
      // `aria-selected` on a row is only meaningful inside a grid.
      expect(rows[0]).toHaveAttribute("aria-selected", "false");
      expect(rows[0]).toHaveAttribute("aria-rowindex", "2");
    });

    it("a clickable row is reachable and operable from the keyboard", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      renderGrid({ onRowClick });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      const row = dataRows()[0];
      expect(row).toHaveAttribute("tabindex", "0");

      row.focus();
      await user.keyboard("{Enter}");
      expect(onRowClick).toHaveBeenCalledTimes(1);

      await user.keyboard(" ");
      expect(onRowClick).toHaveBeenCalledTimes(2);
    });

    it("a non-interactive row stays out of the tab order", async () => {
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());
      expect(dataRows()[0]).not.toHaveAttribute("tabindex");
    });

    it("a clickable card is reachable and operable from the keyboard", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      renderGrid({
        card: (u) => <span>{u.name}</span>,
        defaultView: "cards",
        onRowClick,
      });

      // The card mirrors the table row's keyboard contract — before the fix it was a
      // click-only <div>, so cards/kanban lost what the table already had.
      const card = (await screen.findByText("Leanne")).closest<HTMLElement>(
        '[role="group"]'
      );
      expect(card).not.toBeNull();
      expect(card).toHaveAttribute("tabindex", "0");

      card!.focus();
      await user.keyboard("{Enter}");
      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: "Leanne" })
      );

      await user.keyboard(" ");
      expect(onRowClick).toHaveBeenCalledTimes(2);
    });

    it("a non-interactive card stays out of the tab order", async () => {
      renderGrid({ card: (u) => <span>{u.name}</span>, defaultView: "cards" });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      // No click handler → no role and nothing focusable around the content.
      expect(screen.getByText("Leanne").closest('[role="group"]')).toBeNull();
      expect(screen.getByText("Leanne").closest("[tabindex]")).toBeNull();
    });

    it("a clickable card keeps its own controls in the accessibility tree", async () => {
      renderGrid({
        card: (u) => <span>{u.name}</span>,
        defaultView: "cards",
        onRowClick: vi.fn(),
        selectable: true,
      });

      /*
       * The point of `role="group"` over `role="button"`: a presentational-children role
       * on the wrapper prunes the whole subtree, so a screen-reader user could not select
       * a card or reach its actions at all.
       *
       * jsdom does not implement that pruning — `getByRole` would still find the checkbox
       * under a `role="button"` wrapper — so the assertion that actually guards the
       * regression is the role itself. Verified against Chrome's accessibility tree.
       */
      const card = (await screen.findByText("Leanne")).closest<HTMLElement>(
        "[tabindex]"
      );
      expect(card).not.toBeNull();
      expect(PRESENTATIONAL_CHILDREN_ROLES).not.toContain(
        card!.getAttribute("role")
      );
      expect(within(card!).getByRole("checkbox")).toBeInTheDocument();
      expect(within(card!).getAllByRole("button").length).toBeGreaterThan(0);
    });
  });

  describe("columns popover", () => {
    it("hides a column and restores it on reset", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      const before = visibleLeafCount();
      await openOverflowMenu(user);
      await user.click(screen.getByRole("button", { name: "Columns" }));
      const panel = await screen.findByRole("dialog", { name: "Columns" });

      await user.click(within(panel).getByRole("checkbox", { name: /name/i }));
      await waitFor(() => expect(visibleLeafCount()).toBe(before - 1));

      await user.click(screen.getByRole("button", { name: /reset layout/i }));
      await waitFor(() => expect(visibleLeafCount()).toBe(before));
    });

    it("opens nested inside the overflow menu without closing it", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await openOverflowMenu(user);
      await user.click(screen.getByRole("button", { name: "Columns" }));
      const panel = await screen.findByRole("dialog", { name: "Columns" });

      // The containment case the fixed-not-portal decision exists for: the Columns
      // panel is a DOM child of the overflow menu, so clicking inside it must not
      // count as "outside" for the menu underneath — a portal would break this.
      await user.click(within(panel).getByRole("checkbox", { name: /role/i }));
      expect(screen.getByRole("dialog", { name: "Columns" })).toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "More options" })).toBeInTheDocument();

      // A genuinely outside press still closes both.
      await user.click(screen.getByText("Users"));
      await waitFor(() =>
        expect(screen.queryByRole("dialog", { name: "Columns" })).not.toBeInTheDocument()
      );
      expect(
        screen.queryByRole("dialog", { name: "More options" })
      ).not.toBeInTheDocument();
    });

    it("the overflow panel carries the viewport clamp", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await openOverflowMenu(user);
      const panel = screen.getByRole("dialog", { name: "More options" });

      // jsdom does no layout, so the observable contract is the style the hook wires
      // in: viewport-positioned with a real maxHeight for the internal scroll to obey.
      // The clamp arithmetic itself is pinned in useAnchoredPanel.test.ts.
      expect(panel.style.position).toBe("fixed");
      const max = Number.parseInt(panel.style.maxHeight, 10);
      expect(Number.isNaN(max)).toBe(false);
      expect(max).toBeLessThanOrEqual(window.innerHeight);
    });

    it("refuses to hide the last visible column", async () => {
      const user = userEvent.setup();
      renderGrid({ columns: [COLUMNS[0]] });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await openOverflowMenu(user);
      await user.click(screen.getByRole("button", { name: "Columns" }));
      const panel = await screen.findByRole("dialog", { name: "Columns" });
      // Hiding it would leave an empty rectangle with no way back but Reset.
      expect(within(panel).getByRole("checkbox", { name: /name/i })).toBeDisabled();
    });
  });

  describe("reset view", () => {
    // The command writes column prefs — keep it out of the other tests.
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    /** The command, with the menu already open — the trigger is a toggle. */
    const resetCommand = () =>
      screen.getByRole("button", { name: /reset view/i });

    it("is offered but disabled while the grid is untouched", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await openOverflowMenu(user);
      expect(resetCommand()).toBeDisabled();
    });

    it("puts the search and the columns back at once", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());
      const columnCount = visibleLeafCount();

      // Two separate pieces of view state, one press to undo them.
      await user.type(screen.getByRole("searchbox"), "Leanne");
      await waitFor(() => expect(dataRows()).toHaveLength(1));

      await openOverflowMenu(user);
      await user.click(screen.getByRole("button", { name: /^Columns/ }));
      const panel = await screen.findByRole("dialog", { name: "Columns" });
      await user.click(within(panel).getByRole("checkbox", { name: /role/i }));
      await waitFor(() => expect(visibleLeafCount()).toBe(columnCount - 1));

      // The Columns panel opens inside the menu, so the command is still there.
      await user.click(resetCommand());

      await waitFor(() => expect(visibleLeafCount()).toBe(columnCount));
      expect(screen.getByRole("searchbox")).toHaveValue("");
      expect(dataRows()).toHaveLength(USERS.length);
    });

    it("goes back to disabled once the view is default again", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await user.type(screen.getByRole("searchbox"), "Ervin");
      await waitFor(() => expect(dataRows()).toHaveLength(1));

      await openOverflowMenu(user);
      expect(resetCommand()).toBeEnabled();

      // Running a command dismisses the panel; reopen to read the state back.
      await user.click(resetCommand());
      await openOverflowMenu(user);
      expect(resetCommand()).toBeDisabled();
    });
  });

  describe("form-only columns", () => {
    // Visibility is persisted per storage key — keep it out of the other tests.
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    const withJoined: WithMeta<User, any>[] = [
      ...COLUMNS,
      {
        accessorKey: "joined",
        header: "Joined",
        meta: { label: "Joined", editor: "text", visibleInTable: false },
      },
    ];

    it("keeps the column out of the table but in the form", async () => {
      const ref = createRef<DataGridHandle<User>>();
      renderGrid({ ref, columns: withJoined, onPersist: vi.fn() });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      expect(
        screen.queryByRole("columnheader", { name: "Joined" })
      ).not.toBeInTheDocument();

      await waitFor(() => {
        ref.current?.startCreate();
      });
      const form = await screen.findByRole("dialog");
      expect(within(form).getByLabelText(/joined/i)).toBeInTheDocument();
    });

    it("the Columns popover can still reveal it", async () => {
      const user = userEvent.setup();
      renderGrid({ columns: withJoined });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      const before = visibleLeafCount();
      await openOverflowMenu(user);
      // The trigger carries the hidden-column count, so its name is "Columns 1" here.
      await user.click(screen.getByRole("button", { name: /^Columns/ }));
      const panel = await screen.findByRole("dialog", { name: "Columns" });

      await user.click(within(panel).getByRole("checkbox", { name: /joined/i }));
      await waitFor(() => expect(visibleLeafCount()).toBe(before + 1));
    });
  });

  describe("column reorder reaches the mounted rows", () => {
    // Reordering writes column prefs to localStorage — keep it out of the other tests.
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    const headerTexts = () =>
      [...document.querySelectorAll("thead tr:first-child th")].map(
        (th) => th.textContent ?? ""
      );

    it("moving a column later reorders the body cells, not just the header", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      // Baseline: Name first, so the first data cell is the name.
      expect(headerTexts()[0]).toMatch(/name/i);
      const before = within(dataRows()[0]).getAllByRole("cell");
      expect(before[0]).toHaveTextContent("Leanne");

      await openOverflowMenu(user);
      await user.click(screen.getByRole("button", { name: "Columns" }));
      const panel = await screen.findByRole("dialog", { name: "Columns" });
      await user.click(
        within(panel).getByRole("button", { name: "Move Name later" })
      );

      await waitFor(() => expect(headerTexts()[0]).toMatch(/role/i));

      // The regression: the header and <colgroup> realigned but the memoized rows
      // skipped the re-render, leaving "Leanne" under the "Role" header.
      const cells = within(dataRows()[0]).getAllByRole("cell");
      expect(cells[0]).toHaveTextContent("admin");
      expect(cells[1]).toHaveTextContent("Leanne");
    });
  });

  describe("consumer editorProps extend the editor, not replace it", () => {
    const editorPropsCols: WithMeta<User, any>[] = [
      {
        accessorKey: "name",
        header: "Name",
        meta: {
          label: "Name",
          editor: "text",
          editorProps: { className: "my-extra-class" },
        },
      },
      {
        accessorKey: "active",
        header: "Active",
        meta: {
          label: "Active",
          editor: "switch",
          editorProps: { className: "break-the-track" },
        },
      },
    ];

    it("merges a custom className with the editor chrome, keeping the error styling", async () => {
      const user = userEvent.setup();
      const ref = createRef<DataGridHandle<User>>();
      renderGrid({ ref, columns: editorPropsCols, onPersist: vi.fn() });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await waitFor(() => ref.current?.startEdit(USERS[0]));
      const dialog = await screen.findByRole("dialog");
      const input = within(dialog).getByRole("textbox", { name: /name/i });

      // The regression: `...editorProps` after the `className` key replaced the whole
      // merged string, so the custom class won and the field chrome vanished.
      expect(input.className).toContain("my-extra-class");
      expect(input.className).toContain("border-border-default");

      await user.clear(input);
      await user.click(within(dialog).getByRole("button", { name: /^save$/i }));

      // The worst case was validation: the `aria-invalid` visuals silently vanished
      // exactly when the field became invalid.
      await waitFor(() => expect(input).toHaveAttribute("aria-invalid", "true"));
      expect(input.className).toContain("border-danger");
      expect(input.className).toContain("my-extra-class");
    });

    it("the switch keeps its visually-hidden input wiring despite a custom className", async () => {
      const ref = createRef<DataGridHandle<User>>();
      renderGrid({ ref, columns: editorPropsCols, onPersist: vi.fn() });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await waitFor(() => ref.current?.startEdit(USERS[0]));
      const dialog = await screen.findByRole("dialog");
      const toggle = within(dialog).getByRole("checkbox", { name: /active/i });

      // An override here would strip `sr-only peer` and break the whole track.
      expect(toggle.className).toContain("sr-only");
      expect(toggle.className).not.toContain("break-the-track");
    });
  });

  describe("edit-session identity honours a custom idAccessor", () => {
    // The README's own case: rows keyed by a business number, no `id`/`uuid` at all —
    // the `getRowId` fallback resolves every row to "" here.
    type Employee = { employeeNumber: string; name: string };
    const EMPLOYEES: Employee[] = [
      { employeeNumber: "E-001", name: "Alice" },
      { employeeNumber: "E-002", name: "Bob" },
    ];
    const empColumns: WithMeta<Employee, any>[] = [
      { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
    ];
    const empSchema = z.object({ name: z.string().min(1) });

    it("switching the session between rows loads the new row's values", async () => {
      const ref = createRef<DataGridHandle<Employee>>();
      render(
        <DataGrid<Employee, any>
          title="Employees"
          columns={empColumns}
          zodSchema={empSchema as never}
          initialData={EMPLOYEES}
          idAccessor={(r) => r.employeeNumber}
          onPersist={vi.fn()}
          ref={ref}
        />
      );
      await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument());

      await waitFor(() => ref.current?.startEdit(EMPLOYEES[0]));
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("textbox", { name: /name/i })
      ).toHaveValue("Alice");

      // No intermediate close — the regression kept the form keyed "edit-" for every
      // row, so B's session silently held A's values (and saving wrote A onto B).
      await waitFor(() => ref.current?.startEdit(EMPLOYEES[1]));
      await waitFor(() =>
        expect(
          within(screen.getByRole("dialog")).getByRole("textbox", {
            name: /name/i,
          })
        ).toHaveValue("Bob")
      );
    });
  });
});
