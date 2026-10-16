import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridHandle, type DataGridProps } from "../../DataGrid";
import type { WithMeta } from "../../types/column";

/* ------------------------------------------------------------------ */
/* Flat fixture                                                        */
/* ------------------------------------------------------------------ */

type Plan = {
  id: number;
  name: string;
  quota: number | null;
  /** No editor: read-only in the row. */
  seats: number;
  note: string;
};

const PLANS: Plan[] = [
  { id: 1, name: "Ada", quota: 5, seats: 11, note: "first" },
  { id: 2, name: "Bo", quota: 3, seats: 22, note: "second" },
];

/* The number editor hands back "" while never filled, so a draft's quota is "" or a number. */
const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quota: z.number().nullable().or(z.literal("")),
  note: z.string(),
});

const PLAN_COLUMNS: WithMeta<Plan, any>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
  { accessorKey: "quota", header: "Quota", meta: { label: "Quota", editor: "number" } },
  { accessorKey: "seats", header: "Seats" },
  { accessorKey: "note", header: "Note", meta: { label: "Note", editor: "textarea" } },
];

type User = ReturnType<typeof userEvent.setup>;

function renderPlans(props: Partial<DataGridProps<Plan, any>> = {}) {
  const onPersist = vi.fn(
    async (_m: string, v: unknown, prev?: Plan): Promise<Plan> =>
      ({ ...(prev ?? { id: 99, seats: 0 }), ...(v as object) }) as Plan
  );
  const utils = render(
    <DataGrid<Plan, any>
      title="Plans"
      columns={PLAN_COLUMNS}
      zodSchema={planSchema as never}
      initialData={PLANS}
      editContainer="row"
      onPersist={onPersist}
      {...props}
    />
  );
  return { ...utils, onPersist };
}

const editingRow = () => document.querySelector<HTMLTableRowElement>("tr[data-editing]");

const startEdit = async (user: User, name: string) => {
  await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument());
  const row = screen.getByText(name).closest("tr")!;
  await user.click(within(row).getByRole("button", { name: "Edit" }));
  await waitFor(() => expect(editingRow()).not.toBeNull());
  return editingRow()!;
};

const nameField = (row: HTMLElement) =>
  within(row).getByRole("textbox", { name: "Name" }) as HTMLInputElement;

/* ------------------------------------------------------------------ */

describe("EditingRow in a flat grid", () => {
  it("turns the row's cells into editors and keeps the other rows", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    expect(nameField(row)).toHaveValue("Ada");
    expect(within(row).getByRole("spinbutton", { name: "Quota" })).toHaveValue(5);
    // A textarea has no 28px form: its cell shows the value with a pencil.
    const note = row.querySelector('[data-col-id="note"]') as HTMLElement;
    expect(within(note).getByRole("button", { name: "Edit Note" })).toHaveTextContent("first");
    expect(within(note).queryByRole("textbox")).toBeNull();
    // The display cell for the name is gone; the editor stands in its place.
    expect(within(row).queryByText("Ada")).toBeNull();

    // The other row is untouched.
    const other = screen.getByText("Bo").closest("tr")!;
    expect(other).not.toHaveAttribute("data-editing");
    expect(within(other).queryByRole("textbox")).toBeNull();

    // Editors in the cells, not a form under the row: one `<tr>` per row, no `<form>`.
    expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(document.querySelector("tbody form")).toBeNull();
  });

  it("shows a column with no editor read-only", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    const seats = row.querySelector('[data-col-id="seats"]')!;
    expect(seats).toHaveTextContent("11");
    expect(within(seats as HTMLElement).queryByRole("textbox")).toBeNull();
  });

  it("replaces the action pill with Save and Cancel", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    expect(within(row).getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Edit" })).toBeNull();
    // The other row keeps its pill.
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(1);
  });

  it("focuses the first editor when the session opens", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");
    expect(nameField(row)).toHaveFocus();
  });

  it("saves on Enter with every declared column, visible or not", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    const row = await startEdit(user, "Ada");

    await user.clear(nameField(row));
    await user.type(nameField(row), "Ada Lovelace{Enter}");

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    const [mode, values, prev] = onPersist.mock.calls[0];
    expect(mode).toBe("edit");
    expect(values).toEqual({ name: "Ada Lovelace", quota: 5, note: "first" });
    expect(prev).toBe(PLANS[0]);

    // The row returns to display with the saved value.
    await waitFor(() => expect(editingRow()).toBeNull());
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("saves from the Save button", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    const row = await startEdit(user, "Ada");

    await user.click(within(row).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(editingRow()).toBeNull());
  });

  it("cancels on Esc and drops the typed value", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    const row = await startEdit(user, "Ada");

    await user.type(nameField(row), "x{Escape}");

    await waitFor(() => expect(editingRow()).toBeNull());
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(onPersist).not.toHaveBeenCalled();
  });

  it("cancels from the Cancel button", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    const row = await startEdit(user, "Ada");

    await user.click(within(row).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(editingRow()).toBeNull());
    expect(onPersist).not.toHaveBeenCalled();
  });

  it("lets Enter in the popover's textarea take a newline instead of saving", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    const row = await startEdit(user, "Ada");

    await user.click(within(row).getByRole("button", { name: "Edit Note" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Note" });
    const field = within(dialog).getByRole("textbox", { name: "Note" });
    await user.click(field);
    await user.keyboard("{Enter}");

    expect(field).toHaveValue("first\n");
    expect(onPersist).not.toHaveBeenCalled();
    expect(editingRow()).not.toBeNull();
    expect(screen.getByRole("dialog", { name: "Edit Note" })).toBeInTheDocument();
  });

  it("rings an invalid cell and does not save", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    const row = await startEdit(user, "Ada");

    await user.clear(nameField(row));
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(nameField(row)).toHaveAttribute("aria-invalid", "true")
    );
    expect(nameField(row)).toHaveAccessibleDescription("Name is required");
    expect(onPersist).not.toHaveBeenCalled();
    expect(editingRow()).not.toBeNull();
  });

  it("moves focus to the first invalid field on submit", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    await user.clear(nameField(row));
    const quota = within(row).getByRole("spinbutton", { name: "Quota" });
    quota.focus();
    expect(quota).toHaveFocus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(nameField(row)).toHaveFocus());
  });

  it("shows a server error in a strip under the row and clears it on the next change", async () => {
    const user = userEvent.setup({ delay: null });
    const onPersist = vi.fn(async () => {
      throw new Error("Name already taken");
    });
    renderPlans({ onPersist });
    const row = await startEdit(user, "Ada");

    await user.keyboard("{Enter}");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Name already taken");
    // The strip is the row right under the editing row, spanning the table.
    const strip = row.nextElementSibling as HTMLTableRowElement;
    expect(strip).toContainElement(alert);
    expect(strip.querySelector("td")).toHaveAttribute(
      "colspan",
      String(document.querySelectorAll("colgroup col").length)
    );
    expect(editingRow()).toBe(row);

    await user.type(nameField(row), "x");
    await waitFor(() => expect(screen.queryByText("Name already taken")).toBeNull());
  });

  it("leaves the selection cell empty on the row in session", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans({ selectable: true });
    const row = await startEdit(user, "Ada");

    expect(within(row).queryByRole("checkbox")).toBeNull();
    expect(row.children).toHaveLength(document.querySelectorAll("colgroup col").length);
  });

  it("opens a draft as the first body row on create and saves it on Enter", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(editingRow()).not.toBeNull());
    const draft = editingRow()!;

    const bodyRows = document.querySelectorAll("tbody tr");
    expect(bodyRows[0]).toBe(draft);
    expect(bodyRows).toHaveLength(3);
    expect(nameField(draft)).toHaveValue("");
    // A column with no editor is blank on a draft.
    expect(draft.querySelector('[data-col-id="seats"]')).toHaveTextContent("");

    await user.type(nameField(draft), "Cy{Enter}");

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    expect(onPersist.mock.calls[0][0]).toBe("create");
    expect(onPersist.mock.calls[0][1]).toEqual({ name: "Cy", quota: "", note: "" });
    await waitFor(() => expect(screen.getByText("Cy")).toBeInTheDocument());

    // Enter chains: a fresh draft takes the first row, empty and focused.
    const next = editingRow()!;
    expect(next).not.toBe(draft);
    expect(document.querySelectorAll("tbody tr")[0]).toBe(next);
    expect(nameField(next)).toHaveValue("");
    expect(nameField(next)).toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(editingRow()).toBeNull());
    expect(onPersist).toHaveBeenCalledTimes(1);
  });

  it("closes the draft when it is saved from the Save button", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(editingRow()).not.toBeNull());
    await user.type(nameField(editingRow()!), "Cy");
    await user.click(within(editingRow()!).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(editingRow()).toBeNull());
    expect(screen.getByText("Cy")).toBeInTheDocument();
  });

  it("renders no overlay container", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    await startEdit(user, "Ada");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Tree fixture                                                        */
/* ------------------------------------------------------------------ */

type Unit = { id: number; parentId: number | null; name: string; headcount: number };

const UNITS: Unit[] = [
  { id: 1, parentId: null, name: "Engineering", headcount: 40 },
  { id: 2, parentId: 1, name: "Platform", headcount: 12 },
  { id: 3, parentId: 2, name: "Infra", headcount: 5 },
  { id: 4, parentId: null, name: "Sales", headcount: 15 },
];

const unitSchema = z.object({
  name: z.string().min(1),
  parentId: z.number().nullable(),
});

const UNIT_COLUMNS: WithMeta<Unit, any>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
  { accessorKey: "headcount", header: "Headcount" },
  {
    accessorKey: "parentId",
    header: "Parent",
    meta: { label: "Parent", editor: "number", visibleInTable: false },
  },
];

function renderUnits(props: Partial<DataGridProps<Unit, any>> = {}) {
  /* Each create gets its own id, as a server would give it. */
  let nextId = 99;
  const onPersist = vi.fn(
    async (_m: string, v: unknown, prev?: Unit): Promise<Unit> =>
      ({ ...(prev ?? { id: nextId++, headcount: 0 }), ...(v as object) }) as Unit
  );
  const utils = render(
    <DataGrid<Unit, any>
      title="Units"
      columns={UNIT_COLUMNS}
      zodSchema={unitSchema as never}
      initialData={UNITS}
      tree={{ parentKey: "parentId" }}
      editContainer="row"
      onPersist={onPersist}
      {...props}
    />
  );
  return { ...utils, onPersist };
}

describe("EditingRow in a tree", () => {
  it("keeps the row's level and chevron while its name is edited", async () => {
    const user = userEvent.setup({ delay: null });
    renderUnits();
    const row = await startEdit(user, "Platform");

    expect(row).toHaveAttribute("aria-level", "2");
    expect(row).toHaveAttribute("aria-expanded", "false");
    const nameCell = row.querySelector('[data-col-id="name"]') as HTMLElement;
    expect(within(nameCell).getByRole("textbox", { name: "Name" })).toHaveValue("Platform");
    expect(
      within(nameCell).getByRole("button", { name: "Expand Platform" })
    ).toBeInTheDocument();
    // The rows around it are still there, in order.
    expect(
      [...document.querySelectorAll("tbody tr")].map((tr) => tr.getAttribute("aria-level"))
    ).toEqual(["1", "2", "1"]);
  });

  it("carries the hidden parent key through the save", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderUnits();
    const row = await startEdit(user, "Platform");

    await user.type(nameField(row), " Eng{Enter}");

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    expect(onPersist.mock.calls[0][1]).toEqual({ name: "Platform Eng", parentId: 1 });
  });

  it("draws a draft with the indent of a root and no chevron", async () => {
    const user = userEvent.setup({ delay: null });
    renderUnits();
    await waitFor(() => expect(screen.getByText("Engineering")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(editingRow()).not.toBeNull());
    const draft = editingRow()!;

    expect(draft).toHaveAttribute("aria-level", "1");
    expect(draft).not.toHaveAttribute("aria-expanded");
    expect(within(draft).queryByRole("button", { name: /expand|collapse/i })).toBeNull();
    expect(nameField(draft)).toHaveValue("");
  });
});

/* ------------------------------------------------------------------ */
/* Draft placement in a tree                                           */
/* ------------------------------------------------------------------ */

/** Every body row top to bottom as `<name>@<level>`, the draft as `draft@<level>`. */
const outline = () =>
  [...document.querySelectorAll<HTMLTableRowElement>("tbody tr[aria-level]")].map((tr) => {
    const level = tr.getAttribute("aria-level");
    if (tr.hasAttribute("data-editing")) return `draft@${level}`;
    const name = tr.querySelector('[data-col-id="name"] .dg-cell-content')?.textContent;
    return `${name}@${level}`;
  });

const ROOTS_OPEN = ["Engineering@1", "Platform@2", "Sales@1"];

describe("draft placement in a tree", () => {
  it("follows the visible children of an open parent, one level below it", async () => {
    const ref = createRef<DataGridHandle<Unit>>();
    renderUnits({ ref });
    await waitFor(() => expect(outline()).toEqual(ROOTS_OPEN));

    act(() => ref.current?.startCreate({ parentId: 1 }));

    await waitFor(() =>
      expect(outline()).toEqual(["Engineering@1", "Platform@2", "draft@2", "Sales@1"])
    );
    const draft = editingRow()!;
    expect(draft).not.toHaveAttribute("aria-expanded");
    expect(within(draft).queryByRole("button", { name: /expand|collapse/i })).toBeNull();
    expect(nameField(draft)).toHaveFocus();
  });

  it("opens a closed parent and sits as its last child", async () => {
    const ref = createRef<DataGridHandle<Unit>>();
    renderUnits({ ref });
    await waitFor(() => expect(outline()).toEqual(ROOTS_OPEN));
    expect(screen.getByText("Platform").closest("tr")).toHaveAttribute("aria-expanded", "false");

    act(() => ref.current?.startCreate({ parentId: 2 }));

    await waitFor(() =>
      expect(outline()).toEqual([
        "Engineering@1",
        "Platform@2",
        "Infra@3",
        "draft@3",
        "Sales@1",
      ])
    );
    expect(screen.getByText("Platform").closest("tr")).toHaveAttribute("aria-expanded", "true");
  });

  it("follows the last root when the seed names no parent", async () => {
    const user = userEvent.setup({ delay: null });
    renderUnits();
    await waitFor(() => expect(outline()).toEqual(ROOTS_OPEN));

    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(outline()).toEqual(["Engineering@1", "Platform@2", "Sales@1", "draft@1"])
    );
  });

  it("saves a seeded draft under its parent with the parent key carried", async () => {
    const user = userEvent.setup({ delay: null });
    const ref = createRef<DataGridHandle<Unit>>();
    const { onPersist } = renderUnits({ ref });
    await waitFor(() => expect(outline()).toEqual(ROOTS_OPEN));

    act(() => ref.current?.startCreate({ parentId: 2 }));
    await waitFor(() => expect(editingRow()).not.toBeNull());
    await user.type(nameField(editingRow()!), "Security{Enter}");

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    expect(onPersist.mock.calls[0][0]).toBe("create");
    expect(onPersist.mock.calls[0][1]).toEqual({ name: "Security", parentId: 2 });
    // Enter chains the next sibling: a fresh draft under the same parent, after the save.
    await waitFor(() =>
      expect(outline()).toEqual([
        "Engineering@1",
        "Platform@2",
        "Infra@3",
        "Security@3",
        "draft@3",
        "Sales@1",
      ])
    );
    const next = editingRow()!;
    expect(nameField(next)).toHaveValue("");
    expect(nameField(next)).toHaveFocus();

    await user.type(nameField(next), "Data{Enter}");
    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(2));
    expect(onPersist.mock.calls[1][1]).toEqual({ name: "Data", parentId: 2 });

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(outline()).toEqual([
        "Engineering@1",
        "Platform@2",
        "Infra@3",
        "Security@3",
        "Data@3",
        "Sales@1",
      ])
    );
  });

  it("stays while a search hides its parent, drawn as a root", async () => {
    const user = userEvent.setup({ delay: null });
    const ref = createRef<DataGridHandle<Unit>>();
    renderUnits({ ref });
    await waitFor(() => expect(outline()).toEqual(ROOTS_OPEN));

    act(() => ref.current?.startCreate({ parentId: 1 }));
    await waitFor(() => expect(outline()).toContain("draft@2"));

    await user.type(screen.getByRole("searchbox"), "Sales");

    await waitFor(() => expect(outline()).toEqual(["Sales@1", "draft@1"]));
    expect(editingRow()).not.toBeNull();

    await user.clear(screen.getByRole("searchbox"));
    await waitFor(() =>
      expect(outline()).toEqual(["Engineering@1", "Platform@2", "draft@2", "Sales@1"])
    );
  });

  it("stays while a search hides every row", async () => {
    const user = userEvent.setup({ delay: null });
    renderUnits();
    await waitFor(() => expect(outline()).toEqual(ROOTS_OPEN));

    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(editingRow()).not.toBeNull());

    await user.type(screen.getByRole("searchbox"), "zzz");

    await waitFor(() => expect(outline()).toEqual(["draft@1"]));
  });
});

/* ------------------------------------------------------------------ */
/* Session rules                                                       */
/* ------------------------------------------------------------------ */

describe("one session at a time in row mode", () => {
  it("a dirty row refuses startCreate and takes focus back", async () => {
    const user = userEvent.setup({ delay: null });
    const ref = createRef<DataGridHandle<Plan>>();
    renderPlans({ ref });
    const row = await startEdit(user, "Ada");
    await user.type(nameField(row), "x");

    // Focus leaves the row for the Add button, whose click asks for a create session.
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(editingRow()).toBe(row);
    expect(nameField(row)).toHaveValue("Adax");
    expect(document.querySelectorAll("tr[data-editing]")).toHaveLength(1);
    await waitFor(() => expect(nameField(row)).toHaveFocus());

    // The handle follows the same rule.
    act(() => ref.current?.startCreate());
    expect(editingRow()).toBe(row);
    expect(ref.current?.isEditing()).toBe(true);
  });

  it("a dirty row refuses Edit on another row", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");
    await user.type(nameField(row), "x");

    const other = screen.getByText("Bo").closest("tr")!;
    await user.click(within(other).getByRole("button", { name: "Edit" }));

    expect(editingRow()).toBe(row);
    expect(other).not.toHaveAttribute("data-editing");
    await waitFor(() => expect(nameField(row)).toHaveFocus());
  });

  it("an untouched draft gives way to the next session", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(editingRow()).not.toBeNull());

    const row = await startEdit(user, "Ada");
    expect(document.querySelectorAll("tr[data-editing]")).toHaveLength(1);
    expect(nameField(row)).toHaveValue("Ada");
  });

  it("a row returned to its original values gives way too", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");
    await user.type(nameField(row), "x{Backspace}");

    const bo = await startEdit(user, "Bo");
    expect(nameField(bo)).toHaveValue("Bo");
    expect(document.querySelectorAll("tr[data-editing]")).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* Focus                                                               */
/* ------------------------------------------------------------------ */

describe("focus in a row session", () => {
  it("reaches Save with Tab from the last editor, and comes back with Shift+Tab", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    // The last editor is the note's pencil; a click would open its popover.
    const pencil = within(row).getByRole("button", { name: "Edit Note" });
    act(() => pencil.focus());
    await user.tab();
    expect(within(row).getByRole("button", { name: "Save" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(pencil).toHaveFocus();
  });

  it("a click on an editable cell starts the session on that cell's editor", async () => {
    const user = userEvent.setup({ delay: null });
    const onEditStateChange = vi.fn();
    renderPlans({ onEditStateChange });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const ada = screen.getByText("Ada").closest("tr")!;
    await user.click(within(ada).getByText("5").closest("td")!);

    await waitFor(() => expect(editingRow()).not.toBeNull());
    const row = editingRow()!;
    expect(within(row).getByRole("spinbutton", { name: "Quota" })).toHaveFocus();
    expect(nameField(row)).toHaveValue("Ada");
    // The focus target is the grid's own business; the consumer sees an edit session.
    expect(onEditStateChange).toHaveBeenLastCalledWith({ kind: "edit", row: PLANS[0] });
  });

  it("a click on a cell with no editor opens nothing", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const seats = screen.getByText("11").closest("td")!;
    expect(seats).not.toHaveAttribute("data-row-editable");
    await user.click(seats);

    expect(editingRow()).toBeNull();
  });

  it("leaves the cell click to onRowClick when the grid has one", async () => {
    const user = userEvent.setup({ delay: null });
    const onRowClick = vi.fn();
    renderPlans({ onRowClick });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const ada = screen.getByText("Ada").closest("tr")!;
    await user.click(within(ada).getByText("5").closest("td")!);

    expect(onRowClick).toHaveBeenCalledWith(PLANS[0]);
    expect(editingRow()).toBeNull();
    // The pill's Edit still starts the session.
    await startEdit(user, "Ada");
  });

  it("starts the session on a double-click when the grid has onRowClick", async () => {
    const user = userEvent.setup({ delay: null });
    const onRowClick = vi.fn();
    renderPlans({ onRowClick });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const ada = screen.getByText("Ada").closest("tr")!;
    await user.dblClick(within(ada).getByText("5").closest("td")!);

    await waitFor(() => expect(editingRow()).not.toBeNull());
    expect(
      within(editingRow()!).getByRole("spinbutton", { name: "Quota" })
    ).toHaveFocus();
  });

  it("keeps room in the last column for Save and Cancel", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    const cells = [...row.querySelectorAll<HTMLElement>("[data-col-id]")];
    expect(cells.at(-1)?.dataset.colId).toBe("note");
    expect(cells.at(-1)?.className).toContain("!pr-[76px]");
    expect(cells[0].className).not.toContain("!pr-[76px]");
  });

  it("after a save, focus lands on the saved row's first editable cell, and Enter reopens it", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    await user.type(nameField(row), " L{Enter}");

    await waitFor(() => expect(editingRow()).toBeNull());
    const nameCell = screen.getByText("Ada L").closest("td")!;
    expect(nameCell).toHaveAttribute("data-row-editable");
    expect(nameCell).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(editingRow()).not.toBeNull());
    expect(nameField(editingRow()!)).toHaveFocus();
  });

  it("after a cancel, focus returns to the row's first editable cell", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    await user.type(nameField(row), "x{Escape}");

    await waitFor(() => expect(editingRow()).toBeNull());
    expect(screen.getByText("Ada").closest("td")).toHaveFocus();
  });

  it("a draft saved from the Save button hands focus to the new row", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(editingRow()).not.toBeNull());
    await user.type(nameField(editingRow()!), "Cy");
    await user.click(within(editingRow()!).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(editingRow()).toBeNull());
    expect(screen.getByText("Cy").closest("td")).toHaveFocus();
  });
});

/* ------------------------------------------------------------------ */
/* Rich editors in a row                                               */
/* ------------------------------------------------------------------ */

describe("a textarea column in a row session", () => {
  const openNote = async (user: User, row: HTMLElement) => {
    await user.click(within(row).getByRole("button", { name: "Edit Note" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Note" });
    return { dialog, field: within(dialog).getByRole("textbox", { name: "Note" }) };
  };

  it("edits through the popover, whose value lands in the submitted row", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    const row = await startEdit(user, "Ada");

    const { dialog, field } = await openNote(user, row);
    expect(field).toHaveValue("first");
    await user.clear(field);
    await user.type(field, "revised");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));

    // The popover closes into the row form: nothing is persisted yet, the cell shows it.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onPersist).not.toHaveBeenCalled();
    expect(within(row).getByRole("button", { name: "Edit Note" })).toHaveTextContent("revised");
    expect(editingRow()).toBe(row);

    await user.click(within(row).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    expect(onPersist.mock.calls[0][1]).toEqual({ name: "Ada", quota: 5, note: "revised" });
  });

  it("reopens on the form's value, not the row's", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    const first = await openNote(user, row);
    await user.clear(first.field);
    await user.type(first.field, "draft text");
    await user.click(within(first.dialog).getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const second = await openNote(user, row);
    expect(second.field).toHaveValue("draft text");
  });

  it("marks the row dirty, so another session is refused", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    const row = await startEdit(user, "Ada");

    const { dialog, field } = await openNote(user, row);
    await user.type(field, " more");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(editingRow()).toBe(row);
    expect(document.querySelectorAll("tr[data-editing]")).toHaveLength(1);
  });

  it("Escape and Cancel in the popover close it alone and keep the row", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans();
    const row = await startEdit(user, "Ada");

    const { field } = await openNote(user, row);
    await user.type(field, " typed{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(editingRow()).toBe(row);
    expect(within(row).getByRole("button", { name: "Edit Note" })).toHaveTextContent("first");

    const { dialog } = await openNote(user, row);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(editingRow()).toBe(row);
    expect(onPersist).not.toHaveBeenCalled();
  });

  it("a click on the cell starts the session on the pencil", async () => {
    const user = userEvent.setup({ delay: null });
    renderPlans();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getByText("first").closest("td")!);

    await waitFor(() => expect(editingRow()).not.toBeNull());
    expect(within(editingRow()!).getByRole("button", { name: "Edit Note" })).toHaveFocus();
  });

  it("rings the pencil when the field is invalid and clears it from the popover", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderPlans({
      zodSchema: planSchema.extend({ note: z.string().min(1, "Note is required") }) as never,
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(editingRow()).not.toBeNull());
    const draft = editingRow()!;
    await user.type(nameField(draft), "Cy{Enter}");

    const pencil = within(draft).getByRole("button", { name: "Edit Note" });
    await waitFor(() => expect(pencil).toHaveAttribute("aria-invalid", "true"));
    expect(pencil).toHaveAccessibleDescription("Note is required");
    expect(onPersist).not.toHaveBeenCalled();

    const { dialog, field } = await openNote(user, draft);
    await user.type(field, "filled");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(pencil).not.toHaveAttribute("aria-invalid"));

    await user.click(within(draft).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    expect(onPersist.mock.calls[0][1]).toEqual({ name: "Cy", quota: "", note: "filled" });
  });
});

/* ------------------------------------------------------------------ */
/* The handle's single-cell popover                                    */
/* ------------------------------------------------------------------ */

describe("startCellEdit on the handle", () => {
  it("opens the popover on a column hidden from the table", async () => {
    const user = userEvent.setup({ delay: null });
    const ref = createRef<DataGridHandle<Unit>>();
    const { onPersist } = renderUnits({ ref });
    await waitFor(() => expect(outline()).toEqual(ROOTS_OPEN));

    const anchor = screen.getByText("Platform").closest("td")!;
    act(() => ref.current?.startCellEdit(UNITS[1], "parentId", anchor));

    const dialog = await screen.findByRole("dialog", { name: "Edit Parent" });
    const field = within(dialog).getByRole("spinbutton", { name: "Parent" });
    expect(field).toHaveValue(1);

    await user.clear(field);
    await user.type(field, "4");
    await user.click(within(dialog).getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    expect(onPersist.mock.calls[0][0]).toBe("cell");
    expect(onPersist.mock.calls[0][1]).toEqual({ name: "Platform", parentId: 4 });
    // The row moved under its new parent.
    await waitFor(() =>
      expect(outline()).toEqual(["Engineering@1", "Sales@1", "Platform@2"])
    );
  });

  it("is refused while a row is dirty", async () => {
    const user = userEvent.setup({ delay: null });
    const ref = createRef<DataGridHandle<Unit>>();
    renderUnits({ ref });
    const row = await startEdit(user, "Platform");
    await user.type(nameField(row), "x");

    act(() => ref.current?.startCellEdit(UNITS[3], "parentId", row));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(editingRow()).toBe(row);
  });
});
