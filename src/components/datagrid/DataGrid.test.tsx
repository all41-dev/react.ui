import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
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

/** Data rows only — group headers and padding rows are also `<tr>`s. */
const dataRows = () =>
  screen.getAllByRole("row").filter((r) => within(r).queryAllByRole("cell").length > 0);

const visibleLeafCount = () =>
  document.querySelectorAll("thead tr:first-child th").length;

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

      await user.click(screen.getByRole("button", { name: /filters/i }));
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
      // `aria-selected` on a row is only meaningful inside a grid.
      expect(grid).toHaveAttribute("aria-rowcount", String(USERS.length));
      const rows = dataRows();
      expect(rows[0]).toHaveAttribute("aria-selected", "false");
      expect(rows[0]).toHaveAttribute("aria-rowindex");
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
  });

  describe("columns popover", () => {
    it("hides a column and restores it on reset", async () => {
      const user = userEvent.setup();
      renderGrid();
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      const before = visibleLeafCount();
      await user.click(screen.getByRole("button", { name: /columns/i }));
      const panel = await screen.findByRole("dialog", { name: "Columns" });

      await user.click(within(panel).getByRole("checkbox", { name: /name/i }));
      await waitFor(() => expect(visibleLeafCount()).toBe(before - 1));

      await user.click(screen.getByRole("button", { name: /reset layout/i }));
      await waitFor(() => expect(visibleLeafCount()).toBe(before));
    });

    it("refuses to hide the last visible column", async () => {
      const user = userEvent.setup();
      renderGrid({ columns: [COLUMNS[0]] });
      await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /columns/i }));
      const panel = await screen.findByRole("dialog", { name: "Columns" });
      // Hiding it would leave an empty rectangle with no way back but Reset.
      expect(within(panel).getByRole("checkbox", { name: /name/i })).toBeDisabled();
    });
  });
});
