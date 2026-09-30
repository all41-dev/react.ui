import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridHandle, type DataGridProps } from "./DataGrid";
import type { WithMeta } from "./types/column";
import type { TreeConfig } from "./types/tree";

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

type Unit = {
  id: number;
  parentId: number | null;
  name: string;
  kind: "division" | "department" | "team";
  headcount: number;
};

/*
 * Engineering            Sales
 * ├ Platform             └ EMEA
 * │ ├ Infra
 * │ └ Tooling
 * └ Product
 */
const UNITS: Unit[] = [
  { id: 1, parentId: null, name: "Engineering", kind: "division", headcount: 40 },
  { id: 2, parentId: 1, name: "Platform", kind: "department", headcount: 12 },
  { id: 3, parentId: 1, name: "Product", kind: "department", headcount: 20 },
  { id: 4, parentId: 2, name: "Infra", kind: "team", headcount: 5 },
  { id: 5, parentId: 2, name: "Tooling", kind: "team", headcount: 7 },
  { id: 6, parentId: null, name: "Sales", kind: "division", headcount: 15 },
  { id: 7, parentId: 6, name: "EMEA", kind: "department", headcount: 9 },
];

const schema = z.object({
  name: z.string().min(1),
  parentId: z.number().nullable(),
  kind: z.string().optional(),
});

const COLUMNS: WithMeta<Unit, any>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
  {
    accessorKey: "kind",
    header: "Kind",
    meta: {
      filter: {
        type: "select",
        options: [
          { value: "division", label: "Division" },
          { value: "department", label: "Department" },
          { value: "team", label: "Team" },
        ],
      },
    },
  },
  { accessorKey: "headcount", header: "Headcount" },
  { accessorKey: "parentId", header: "Parent", meta: { visibleInTable: false } },
];

const TREE: TreeConfig<Unit> = { parentKey: "parentId" };

type OnPersist = NonNullable<DataGridProps<Unit, any>["onPersist"]>;

function renderTree(props: Partial<DataGridProps<Unit, any>> = {}) {
  return render(
    <DataGrid<Unit, any>
      title="Units"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={UNITS}
      tree={TREE}
      {...props}
    />
  );
}

/** The Name cell of every data row on screen, top to bottom. */
const names = () =>
  [...document.querySelectorAll('tbody [data-col-id="name"] .dg-cell-content')].map(
    (el) => el.textContent
  );

const rowOf = (name: string) => screen.getByText(name).closest("tr")!;

const ROOTS_OPEN = ["Engineering", "Platform", "Product", "Sales", "EMEA"];
const ALL_OPEN = [
  "Engineering",
  "Platform",
  "Infra",
  "Tooling",
  "Product",
  "Sales",
  "EMEA",
];

const openOverflowMenu = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: /filters, columns and grouping/i }));

/* ------------------------------------------------------------------ */

describe("DataGrid tree mode", () => {
  describe("structure", () => {
    it("shows the roots open and everything below them closed by default", async () => {
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));
    });

    it("opens every node with defaultOpen all, and none with none", async () => {
      const { unmount } = renderTree({ tree: { ...TREE, defaultOpen: "all" } });
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));
      unmount();

      renderTree({ tree: { ...TREE, defaultOpen: "none" } });
      await waitFor(() => expect(names()).toEqual(["Engineering", "Sales"]));
    });

    it("is a treegrid whose rows carry their level and open state", async () => {
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      expect(screen.getByRole("treegrid", { name: "Units" })).toBeInTheDocument();
      expect(rowOf("Engineering")).toHaveAttribute("aria-level", "1");
      expect(rowOf("Engineering")).toHaveAttribute("aria-expanded", "true");
      expect(rowOf("Platform")).toHaveAttribute("aria-level", "2");
      expect(rowOf("Platform")).toHaveAttribute("aria-expanded", "false");
      // A leaf has nothing to open.
      expect(rowOf("Product")).not.toHaveAttribute("aria-expanded");
    });

    it("indents by depth and puts a chevron on parents only", async () => {
      renderTree({ tree: { ...TREE, defaultOpen: "all" } });
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));

      expect(
        screen.getByRole("button", { name: "Collapse Engineering" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /(expand|collapse) infra/i })
      ).not.toBeInTheDocument();

      const indentOf = (name: string) =>
        rowOf(name).querySelector<HTMLElement>('[data-col-id="name"] [style*="width"]')
          ?.style.width;
      expect(indentOf("Engineering")).toBeUndefined();
      expect(indentOf("Platform")).toBe("18px");
      expect(indentOf("Infra")).toBe("36px");
    });

    it("names the chevron from the raw value when the column formats to an element", async () => {
      const [nameColumn, ...rest] = COLUMNS;
      const columns: WithMeta<Unit, any>[] = [
        {
          ...nameColumn,
          meta: { ...nameColumn.meta, format: (v) => <strong>{String(v)}</strong> },
        },
        ...rest,
      ];
      renderTree({ columns });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      expect(
        screen.getByRole("button", { name: "Collapse Engineering" })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Expand Platform" })).toBeInTheDocument();
    });

    it("leaves a flat grid a plain grid", async () => {
      renderTree({ tree: undefined });
      await waitFor(() => expect(screen.getByText("Infra")).toBeInTheDocument());

      expect(screen.getByRole("grid", { name: "Units" })).toBeInTheDocument();
      expect(rowOf("Infra")).not.toHaveAttribute("aria-level");
      expect(screen.queryByRole("button", { name: /^(expand|collapse) /i })).toBeNull();
    });

    it("draws the level's icon and type tag", async () => {
      renderTree({
        tree: {
          ...TREE,
          typeKey: "kind",
          showTypeTag: true,
          levels: [
            { type: "division", label: "Div", icon: <svg data-testid="div-icon" /> },
            { type: "department" },
          ],
        },
      });
      await waitFor(() => expect(screen.getByText("Engineering")).toBeInTheDocument());

      const cell = rowOf("Engineering").querySelector('[data-col-id="name"]')!;
      expect(within(cell as HTMLElement).getByTestId("div-icon")).toBeInTheDocument();
      expect(within(cell as HTMLElement).getByText("Div")).toBeInTheDocument();
      // No label declared: the tag falls back to the type itself.
      const dept = rowOf("Platform").querySelector('[data-col-id="name"]')!;
      expect(within(dept as HTMLElement).getByText("department")).toBeInTheDocument();
    });

    it("moves the chevron to the configured column", async () => {
      renderTree({ tree: { ...TREE, columnId: "kind" } });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      const button = screen.getAllByRole("button", { name: "Collapse division" })[0];
      expect(button.closest("td")).toHaveAttribute("data-col-id", "kind");
    });
  });

  describe("opening and closing", () => {
    it("toggles a node from its chevron without firing the row click", async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      renderTree({ onRowClick });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.click(screen.getByRole("button", { name: "Expand Platform" }));
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));

      await user.click(screen.getByRole("button", { name: "Collapse Engineering" }));
      await waitFor(() => expect(names()).toEqual(["Engineering", "Sales", "EMEA"]));

      expect(onRowClick).not.toHaveBeenCalled();
    });

    it("remembers a closed child across closing and reopening its parent", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.click(screen.getByRole("button", { name: "Expand Platform" }));
      await user.click(screen.getByRole("button", { name: "Collapse Engineering" }));
      await user.click(screen.getByRole("button", { name: "Expand Engineering" }));
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));
    });

    it("opens with ArrowRight and closes with ArrowLeft on the chevron", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      act(() => screen.getByRole("button", { name: "Expand Platform" }).focus());
      await user.keyboard("{ArrowRight}");
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));

      await user.keyboard("{ArrowLeft}");
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));
    });

    it("expands and collapses everything from the menu", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await openOverflowMenu(user);
      await user.click(screen.getByRole("button", { name: "Expand all" }));
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));

      await openOverflowMenu(user);
      await user.click(screen.getByRole("button", { name: "Collapse all" }));
      await waitFor(() => expect(names()).toEqual(["Engineering", "Sales"]));
    });

    it("expands and collapses everything through the ref", async () => {
      const ref = createRef<DataGridHandle<Unit>>();
      renderTree({ ref });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      act(() => ref.current?.expandAll());
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));

      act(() => ref.current?.collapseAll());
      await waitFor(() => expect(names()).toEqual(["Engineering", "Sales"]));
    });

    it("Reset view restores the default open set", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await openOverflowMenu(user);
      expect(screen.getByRole("button", { name: "Reset view" })).toBeDisabled();
      await user.keyboard("{Escape}");

      await user.click(screen.getByRole("button", { name: "Collapse Engineering" }));
      await waitFor(() => expect(names()).toEqual(["Engineering", "Sales", "EMEA"]));

      await openOverflowMenu(user);
      await user.click(screen.getByRole("button", { name: "Reset view" }));
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));
    });
  });

  describe("search, filters and sorting", () => {
    it("a search match keeps its ancestors and shows them open", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.type(screen.getByRole("searchbox"), "Infra");
      await waitFor(() =>
        expect(names()).toEqual(["Engineering", "Platform", "Infra"])
      );

      // Held open by the search, so the chevrons cannot close them.
      expect(screen.getByRole("button", { name: "Collapse Platform" })).toHaveAttribute(
        "aria-disabled",
        "true"
      );
    });

    it("a chevron held open by the search keeps focus and does nothing", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.type(screen.getByRole("searchbox"), "Infra");
      await waitFor(() => expect(names()).toHaveLength(3));

      const chevron = screen.getByRole("button", { name: "Collapse Engineering" });
      await user.click(chevron);
      expect(chevron).toHaveFocus();

      // A click that went through would bring the tree back with Engineering closed.
      await user.clear(screen.getByRole("searchbox"));
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));
    });

    it("turns Expand all and Collapse all off while a search holds the nodes open", async () => {
      const user = userEvent.setup();
      const ref = createRef<DataGridHandle<Unit>>();
      renderTree({ ref });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.type(screen.getByRole("searchbox"), "Infra");
      await waitFor(() => expect(names()).toHaveLength(3));

      await openOverflowMenu(user);
      expect(screen.getByRole("button", { name: "Expand all" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Collapse all" })).toBeDisabled();
      await user.keyboard("{Escape}");

      // The handle follows the menu, so the stored open state does not change unseen.
      act(() => ref.current?.collapseAll());
      await user.clear(screen.getByRole("searchbox"));
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));
    });

    it("clearing the search brings back the open state from before it", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.type(screen.getByRole("searchbox"), "Infra");
      await waitFor(() => expect(names()).toHaveLength(3));

      await user.clear(screen.getByRole("searchbox"));
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));
    });

    it("a matching parent does not pull in children that do not match", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.type(screen.getByRole("searchbox"), "Platform");
      await waitFor(() => expect(names()).toEqual(["Engineering", "Platform"]));
    });

    it("a column filter keeps ancestors too", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await openOverflowMenu(user);
      await user.click(screen.getByRole("switch", { name: /filter row/i }));
      await user.selectOptions(
        await screen.findByRole("combobox", { name: "Filter by Kind" }),
        "team"
      );

      await waitFor(() =>
        expect(names()).toEqual(["Engineering", "Platform", "Infra", "Tooling"])
      );
    });

    it("counts every kept node, not the roots", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      const pill = () => screen.getByRole("heading", { name: "Units" }).nextElementSibling;
      expect(pill()).toHaveTextContent("7");
      // Infra and Tooling sit under a closed node.
      expect(screen.getByText("5 of 7 shown")).toBeInTheDocument();

      await user.type(screen.getByRole("searchbox"), "Infra");
      await waitFor(() => expect(pill()).toHaveTextContent("3"));
      expect(screen.getByText("3 shown")).toBeInTheDocument();
    });

    it("shows the no-results state when nothing at any depth matches", async () => {
      const user = userEvent.setup();
      renderTree();
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.type(screen.getByRole("searchbox"), "zzz");
      expect(
        await screen.findByRole("button", { name: /clear filters/i })
      ).toBeInTheDocument();
    });

    it("sorts among siblings at every level", async () => {
      renderTree({
        tree: { ...TREE, defaultOpen: "all" },
        initialSorting: [{ id: "name", desc: true }],
      });
      await waitFor(() =>
        expect(names()).toEqual([
          "Sales",
          "EMEA",
          "Engineering",
          "Product",
          "Platform",
          "Tooling",
          "Infra",
        ])
      );
    });

    it("keeps chevrons working while sorted", async () => {
      const user = userEvent.setup();
      renderTree({ initialSorting: [{ id: "name", desc: false }] });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.click(screen.getByRole("button", { name: "Expand Platform" }));
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));
    });
  });

  describe("what tree mode turns off", () => {
    it("has no pager, no view toggle and no group-by, and says why once", async () => {
      const user = userEvent.setup();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      renderTree({
        tree: { ...TREE, defaultOpen: "all" },
        card: (u) => <div>{u.name}</div>,
        groupOptions: [{ key: "kind", label: "Kind" }],
        pagination: { initialState: { pageSize: 5 } },
      });

      // Seven rows: a five-row page would have cut the list.
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));
      expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
      expect(screen.queryByRole("group", { name: "View" })).toBeNull();

      await openOverflowMenu(user);
      expect(screen.queryByRole("radiogroup", { name: "Group by" })).toBeNull();

      const treeWarnings = warn.mock.calls.filter(([m]) =>
        String(m).includes("alongside `tree`")
      );
      expect(treeWarnings).toHaveLength(1);
      expect(String(treeWarnings[0][0])).toMatch(/`card`, `groupOptions`, `pagination`/);
    });

    it("turns a row with a missing parent into a root, with one warning", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const orphan: Unit = {
        id: 8,
        parentId: 99,
        name: "Orphan",
        kind: "team",
        headcount: 1,
      };
      renderTree({ initialData: [...UNITS, orphan] });

      await waitFor(() => expect(names()).toEqual([...ROOTS_OPEN, "Orphan"]));
      expect(rowOf("Orphan")).toHaveAttribute("aria-level", "1");
      expect(
        warn.mock.calls.filter(([m]) => String(m).includes("shown as roots"))
      ).toHaveLength(1);
    });
  });

  describe("selection", () => {
    it("select-all covers the rows on screen, and a parent does not select its children", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      renderTree({ selectable: true, onSelectionChange });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.click(screen.getByRole("checkbox", { name: "Select all visible rows" }));
      await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
      const selected = onSelectionChange.mock.lastCall![0] as Unit[];
      // Infra and Tooling sit under a closed node.
      expect(selected.map((u) => u.name).sort()).toEqual([...ROOTS_OPEN].sort());
    });

    it("selecting a parent leaves its children unselected", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      renderTree({ selectable: true, onSelectionChange });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.click(
        within(rowOf("Engineering")).getByRole("checkbox", { name: "Select row" })
      );
      await waitFor(() => expect(onSelectionChange).toHaveBeenCalled());
      expect(
        (onSelectionChange.mock.lastCall![0] as Unit[]).map((u) => u.name)
      ).toEqual(["Engineering"]);
    });
  });

  describe("writes", () => {
    it("deleting a parent names its nested rows and removes the subtree", async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn().mockResolvedValue(undefined);
      renderTree({ onDelete, tree: { ...TREE, defaultOpen: "all" } });
      await waitFor(() => expect(names()).toEqual(ALL_OPEN));

      await user.click(within(rowOf("Platform")).getByRole("button", { name: "Delete" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent("Delete this item and its 2 nested rows?");
      await user.click(within(dialog).getByRole("button", { name: "Delete" }));

      await waitFor(() =>
        expect(names()).toEqual(["Engineering", "Product", "Sales", "EMEA"])
      );
      // Once, for the row the user deleted.
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(UNITS[1]);
    });

    it("deleting a leaf keeps the plain confirmation", async () => {
      const user = userEvent.setup();
      renderTree({ onDelete: vi.fn().mockResolvedValue(undefined) });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.click(within(rowOf("Product")).getByRole("button", { name: "Delete" }));
      expect(await screen.findByRole("alertdialog")).toHaveTextContent(
        "Delete this item?"
      );
    });

    it("counts one nested row in the singular", async () => {
      const user = userEvent.setup();
      renderTree({ onDelete: vi.fn().mockResolvedValue(undefined) });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.click(within(rowOf("Sales")).getByRole("button", { name: "Delete" }));
      expect(await screen.findByRole("alertdialog")).toHaveTextContent(
        "Delete this item and its 1 nested row?"
      );
    });

    it("a child created under a closed parent opens the way to it", async () => {
      const user = userEvent.setup();
      const ref = createRef<DataGridHandle<Unit>>();
      const onPersist = vi.fn<OnPersist>(async (_mode, values) => ({
        id: 8,
        kind: "team",
        headcount: 0,
        ...values,
      }));
      renderTree({ ref, onPersist });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      // Platform (id 2) is closed; the seed presets the hidden parent field.
      act(() => ref.current?.startCreate({ parentId: 2 }));
      const form = await screen.findByRole("dialog");
      await user.type(within(form).getByLabelText(/name/i), "Security");
      await user.click(within(form).getByRole("button", { name: /^save$/i }));

      await waitFor(() =>
        expect(names()).toEqual([
          "Engineering",
          "Platform",
          "Infra",
          "Tooling",
          "Security",
          "Product",
          "Sales",
          "EMEA",
        ])
      );
      expect(onPersist.mock.lastCall![1]).toMatchObject({
        name: "Security",
        parentId: 2,
      });
    });

    it("an edit that changes the parent moves the row", async () => {
      const user = userEvent.setup();
      const onPersist = vi.fn<OnPersist>(async (_mode, values, prev) => ({
        ...prev!,
        ...values,
        parentId: 6,
      }));
      renderTree({ onPersist });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      await user.click(within(rowOf("Product")).getByRole("button", { name: "Edit" }));
      const form = await screen.findByRole("dialog");
      await user.click(within(form).getByRole("button", { name: /^save$/i }));

      await waitFor(() =>
        expect(names()).toEqual(["Engineering", "Platform", "Sales", "Product", "EMEA"])
      );
      expect(rowOf("Product")).toHaveAttribute("aria-level", "2");
    });
  });

  describe("detail panels", () => {
    it("sits under its own row, above that row's children", async () => {
      renderTree({
        expandedRowIds: new Set([1]),
        renderExpandedRow: (u) => <div>Details of {u.name}</div>,
      });
      await waitFor(() => expect(names()).toEqual(ROOTS_OPEN));

      const panel = screen.getByText("Details of Engineering").closest("tr")!;
      expect(rowOf("Engineering").nextElementSibling).toBe(panel);
      // The parent's `aria-expanded` is its node state, open here by default.
      expect(rowOf("Engineering")).toHaveAttribute("aria-expanded", "true");
      // In a treegrid the attribute marks a parent node, so a leaf carries none.
      expect(rowOf("Product")).not.toHaveAttribute("aria-expanded");
    });

    it("is what a flat grid's row reports", async () => {
      renderTree({
        tree: undefined,
        expandedRowIds: new Set([1]),
        renderExpandedRow: (u) => <div>Details of {u.name}</div>,
      });
      await waitFor(() => expect(screen.getByText("Infra")).toBeInTheDocument());

      expect(rowOf("Engineering")).toHaveAttribute("aria-expanded", "true");
      expect(rowOf("Infra")).toHaveAttribute("aria-expanded", "false");
    });
  });
});
