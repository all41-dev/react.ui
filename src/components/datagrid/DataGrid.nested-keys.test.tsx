import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridProps } from "./DataGrid";
import type { WithMeta } from "./types/column";

/**
 * A dotted `accessorKey` is keyed two different ways on purpose: `user_name` by the
 * table (TanStack's own rule) and `user.name` by the form. Every consumer below reads
 * one of the two, and substituting one for the other unhooks visibility, ordering, cell
 * editing or the form field — silently, since the column still renders.
 */

type Row = {
  id: number;
  user: { name: string; email: string };
  status: string;
};

const ROWS: Row[] = [
  { id: 1, user: { name: "Leanne", email: "leanne@example.com" }, status: "on" },
  { id: 2, user: { name: "Ervin", email: "ervin@example.com" }, status: "off" },
];

const schema = z.object({
  user: z.object({ name: z.string().min(1), email: z.string() }),
  status: z.string(),
});

/* Every key the schema declares carries a column: the form is seeded from the columns
   alone now, so a schema field with no column is missing at submit time. */
const COLUMNS: WithMeta<Row, any>[] = [
  {
    accessorKey: "user.name",
    header: "Name",
    meta: { label: "Name", editor: "text", cellEdit: true },
  },
  {
    accessorKey: "user.email",
    header: "Email",
    meta: { label: "Email", editor: "text" },
  },
  { accessorKey: "status", header: "Status", meta: { label: "Status", editor: "text" } },
];

const renderGrid = (props: Partial<DataGridProps<Row, any>> = {}) =>
  render(
    <DataGrid<Row, any>
      title="Nested"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={ROWS}
      {...props}
    />
  );

const visibleLeafCount = () =>
  document.querySelectorAll("thead tr:first-child th").length;

const openOverflowMenu = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: /filters, columns and grouping/i }));

describe("a dotted accessor key", () => {
  it("renders the nested value in its cell", async () => {
    renderGrid();
    expect(await screen.findByText("Leanne")).toBeInTheDocument();
    expect(screen.getByText("Ervin")).toBeInTheDocument();
  });

  /* The table keys the column `user_name`. Seeding the hidden set with `user.name`
     instead means the column ships visible however the meta is declared. */
  it("stays out of the table when the column ships hidden", async () => {
    renderGrid({
      columns: [
        { ...COLUMNS[0], meta: { ...COLUMNS[0].meta, visibleInTable: false } },
        ...COLUMNS.slice(1),
      ],
    });

    await waitFor(() => expect(screen.getByText("on")).toBeInTheDocument());
    expect(screen.queryByText("Leanne")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /name/i })
    ).not.toBeInTheDocument();
  });

  /* Order and visibility are seeded under one key and written by the popover under the
     other whenever the two rules disagree — the column then refuses to hide. */
  it("can be hidden from the Columns popover", async () => {
    const user = userEvent.setup();
    renderGrid();
    await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());
    const before = visibleLeafCount();

    await openOverflowMenu(user);
    await user.click(screen.getByRole("button", { name: "Columns" }));
    const panel = await screen.findByRole("dialog", { name: "Columns" });
    await user.click(within(panel).getByRole("checkbox", { name: /name/i }));

    await waitFor(() => expect(visibleLeafCount()).toBe(before - 1));
    expect(screen.queryByText("Leanne")).not.toBeInTheDocument();
  });

  it("seeds the edit form from the nested value and submits the nested shape", async () => {
    const user = userEvent.setup();
    const onPersist = vi.fn(async (_m: string, v: unknown) => ({
      ...ROWS[0],
      ...(v as object),
    }));
    renderGrid({ onPersist });
    await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const field = await screen.findByLabelText("Name");
    expect((field as HTMLInputElement).value).toBe("Leanne");

    await user.clear(field);
    await user.type(field, "Renamed");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onPersist).toHaveBeenCalled());
    const [, values] = onPersist.mock.calls[0];
    // The nested shape the schema declares — never a flat `"user.name"` key, which zod
    // strips and the server never sees.
    expect(values).toMatchObject({ user: { name: "Renamed" } });
    // Checked against the literal key list: `toHaveProperty("user.name")` reads the dot
    // as a path and would match the nested value it is meant to rule out.
    expect(Object.keys(values as object)).not.toContain("user.name");
  });

  it("persists the nested value from a cell edit", async () => {
    const user = userEvent.setup();
    const onPersist = vi.fn(async (_m: string, v: unknown) => ({
      ...ROWS[0],
      ...(v as object),
    }));
    renderGrid({ onPersist });

    await user.click(await screen.findByRole("button", { name: "Leanne" }));
    const field = await within(
      await screen.findByRole("dialog", { name: "Edit Name" })
    ).findByLabelText("Name");
    expect((field as HTMLInputElement).value).toBe("Leanne");

    await user.clear(field);
    await user.type(field, "Renamed");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onPersist).toHaveBeenCalledWith(
      "cell",
      expect.objectContaining({ user: expect.objectContaining({ name: "Renamed" }) }),
      expect.anything()
    ));
    // The untouched sibling of the same nested object survives the round-trip.
    const [, values] = onPersist.mock.calls[0] as [string, { user: { email: string } }];
    expect(values.user.email).toBe("leanne@example.com");
  });
});

/**
 * react-hook-form nests by field path, so `errors` and `dirtyFields` for `user.name`
 * arrive as `{ user: { name: … } }` while the grid keys everything by the accessor key.
 * Anything comparing the two has to flatten first, or `user` reads as a field of its own.
 */
describe("a dotted accessor key, in form state", () => {
  it("reports a validation failure once, on the field itself", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ onPersist: vi.fn() });
    await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await user.clear(await screen.findByLabelText("Name"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    // The field's own error, inline.
    const field = screen.getByLabelText("Name");
    await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"));

    /* And no second banner. Comparing raw top-level error keys against the accessor keys
       made `user` look like a field with nothing rendering it. */
    expect(screen.queryByText(/Validation error on 'user'/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Validation error on/)).not.toBeInTheDocument();
  });

  it("marks a changed nested field, and clears the mark when it is put back", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ onPersist: vi.fn() });
    await waitFor(() => expect(screen.getByText("Leanne")).toBeInTheDocument());

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const field = await screen.findByLabelText("Name");
    expect(screen.queryByText("changed")).not.toBeInTheDocument();

    await user.type(field, "!");
    expect(await screen.findByText("changed")).toBeInTheDocument();

    // `dirtyFields` compares against the form's defaults, so the original value clears it.
    await user.clear(field);
    await user.type(field, "Leanne");
    await waitFor(() =>
      expect(screen.queryByText("changed")).not.toBeInTheDocument()
    );
  });
});
