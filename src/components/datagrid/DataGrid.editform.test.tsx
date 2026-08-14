import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridProps } from "./DataGrid";
import type { WithMeta } from "./types/column";

type Row = {
  id: number;
  name: string;
  quota: number | null;
  tier: string;
  /** Carried by the row, declared by no column — the over-post case. */
  updatedAt: string;
};

const ROWS: Row[] = [
  { id: 1, name: "Ada", quota: 5, tier: "gold", updatedAt: "2026-01-01T00:00:00Z" },
];

const TIERS = [
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
];

/* `quota` is nullable: an emptied optional number field produces `null`, which is what
   react-hook-form can tell apart from "no value set". */
const schema = z.object({
  name: z.string().min(1),
  quota: z.number().nullable(),
  tier: z.string(),
});

const COLUMNS: WithMeta<Row, any>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
  { accessorKey: "quota", header: "Quota", meta: { label: "Quota", editor: "number" } },
  {
    accessorKey: "tier",
    header: "Tier",
    meta: { label: "Tier", editor: "select", options: TIERS },
  },
];

const renderGrid = (props: Partial<DataGridProps<Row, any>> = {}) => {
  const onPersist = vi.fn(async (_m: string, v: unknown) => ({
    ...ROWS[0],
    ...(v as object),
  }));
  const utils = render(
    <DataGrid<Row, any>
      title="Plans"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={ROWS}
      onPersist={onPersist}
      {...props}
    />
  );
  return { ...utils, onPersist };
};

const openEditForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
  await screen.findByLabelText("Name");
};

const save = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Save" }));

describe("the edit form's payload", () => {
  /* The form is seeded from the declared columns alone. Copying the whole row made every
     field it carries — audit stamps, server timestamps, nested relations — a form value
     that comes back out of `handleSubmit`. */
  it("carries only the fields the columns declare", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Bo");
    await save(user);

    await waitFor(() => expect(onPersist).toHaveBeenCalled());
    expect(Object.keys(onPersist.mock.calls[0][1] as object).sort()).toEqual([
      "name",
      "quota",
      "tier",
    ]);
  });

  /* `fromForm` describes how a value is STORED, not how it is edited, so it has to run
     over every column carrying an accessor key — the same set the cell commit converts. */
  it("applies `fromForm` on a column with no editor of its own", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderGrid({
      columns: [
        ...COLUMNS,
        {
          accessorKey: "updatedAt",
          header: "Updated",
          meta: { fromForm: () => "stamped" },
        } as WithMeta<Row, any>,
      ],
      zodSchema: schema.extend({ updatedAt: z.string() }) as never,
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);
    await save(user);

    await waitFor(() => expect(onPersist).toHaveBeenCalled());
    expect(onPersist.mock.calls[0][1]).toMatchObject({ updatedAt: "stamped" });
  });
});

describe("an optional number field", () => {
  /* `onChange(undefined)` is read back as "no value set", so react-hook-form returns the
     form default and the cleared field snaps to the value it started with. */
  it("can be emptied, and reaches the consumer as null", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    const quota = screen.getByLabelText("Quota") as HTMLInputElement;
    expect(quota.value).toBe("5");
    await user.clear(quota);
    expect(quota.value).toBe("");

    await save(user);
    await waitFor(() => expect(onPersist).toHaveBeenCalled());
    expect(onPersist.mock.calls[0][1]).toMatchObject({ quota: null });
  });

  it("still submits a number when one is typed", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    const quota = screen.getByLabelText("Quota");
    await user.clear(quota);
    await user.type(quota, "42");
    await save(user);

    await waitFor(() => expect(onPersist).toHaveBeenCalled());
    expect(onPersist.mock.calls[0][1]).toMatchObject({ quota: 42 });
  });
});

describe("an optional select field", () => {
  /* A disabled placeholder means an optional select can never be returned to "no value"
     once one is chosen. Requiredness belongs to the schema, not to the control. */
  it("can be returned to no value", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderGrid({
      zodSchema: schema.extend({ tier: z.string() }) as never,
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    const tier = screen.getByLabelText("Tier") as HTMLSelectElement;
    expect(tier.value).toBe("gold");
    await user.selectOptions(tier, "");
    expect(tier.value).toBe("");

    await save(user);
    await waitFor(() => expect(onPersist).toHaveBeenCalled());
    expect(onPersist.mock.calls[0][1]).toMatchObject({ tier: "" });
  });
});

/**
 * Field names are the caller's accessor keys, so two grids on one page both own a field
 * called `name`. Bare ids collide: `<label htmlFor="name">` resolves to the first match,
 * so clicking one grid's label focuses the other grid's field.
 */
describe("two grids on one page", () => {
  it("gives every field an id of its own", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <>
        <DataGrid<Row, any>
          title="Plans A"
          columns={COLUMNS}
          zodSchema={schema as never}
          initialData={ROWS}
          editContainer="inline"
          onPersist={vi.fn()}
        />
        <DataGrid<Row, any>
          title="Plans B"
          columns={COLUMNS}
          zodSchema={schema as never}
          initialData={ROWS}
          editContainer="inline"
          onPersist={vi.fn()}
        />
      </>
    );
    await waitFor(() =>
      expect(screen.getAllByText("Ada").length).toBeGreaterThan(1)
    );

    for (const button of screen.getAllByRole("button", { name: "Edit" })) {
      await user.click(button);
    }
    await waitFor(() => expect(screen.getAllByLabelText("Name")).toHaveLength(2));

    const fields = screen.getAllByLabelText("Name") as HTMLInputElement[];
    expect(fields[0].id).not.toBe(fields[1].id);
    expect(new Set(fields.map((f) => f.id)).size).toBe(2);

    // Each label resolves to the field inside its own form, not to the first match.
    for (const field of fields) {
      const form = field.closest("form")!;
      const label = document.querySelector(`label[for="${field.id}"]`)!;
      expect(form.contains(label)).toBe(true);
    }
  });
});

describe("a field that fails validation", () => {
  it("points the control at its own error message", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await save(user);

    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    // The id has to be this field's own, or assistive tech reads a message belonging to
    // another form on the page.
    expect(name.getAttribute("aria-describedby")).toBe(alert.id);
    expect(alert.id.startsWith(name.id)).toBe(true);
  });

  it("describes the field by its hint while it is valid", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({
      columns: [
        {
          ...COLUMNS[0],
          meta: { ...COLUMNS[0].meta, description: "Shown to the customer" },
        },
        ...COLUMNS.slice(1),
      ],
    });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    const name = screen.getByLabelText("Name");
    const hint = screen.getByText("Shown to the customer");
    expect(name.getAttribute("aria-describedby")).toBe(hint.id);
  });
});

/** A `cellEdit` column with only an `accessorFn` has nothing to seed an editor from, so
    the affordance is withheld rather than opening an empty popover. */
describe("cell editing without an accessor key", () => {
  it("renders the cell as plain text", async () => {
    renderGrid({
      columns: [
        {
          id: "computed",
          header: "Computed",
          accessorFn: (r: Row) => `${r.name}!`,
          meta: { label: "Computed", editor: "text", cellEdit: true },
        } as WithMeta<Row, any>,
      ],
    });

    await waitFor(() => expect(screen.getByText("Ada!")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Ada!" })).not.toBeInTheDocument();
  });

  it("still offers it when the column declares an accessor key", async () => {
    renderGrid({
      columns: [
        {
          accessorKey: "name",
          header: "Name",
          meta: { label: "Name", editor: "text", cellEdit: true },
        } as WithMeta<Row, any>,
      ],
    });

    expect(await screen.findByRole("button", { name: "Ada" })).toBeInTheDocument();
  });
});

/** The toolbar pill and the pager report the same population. */
describe("the toolbar count", () => {
  it("follows the filtered set rather than the whole one", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <DataGrid<Row, any>
        title="Plans"
        columns={COLUMNS}
        zodSchema={schema as never}
        initialData={[
          ROWS[0],
          { ...ROWS[0], id: 2, name: "Bo" },
          { ...ROWS[0], id: 3, name: "Cy" },
        ]}
      />
    );
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const heading = screen.getByRole("heading", { name: "Plans" });
    const pill = () => heading.parentElement!.querySelector("span")!.textContent;
    expect(pill()).toBe("3");

    await user.type(screen.getByRole("searchbox"), "Ada");
    await waitFor(() => expect(screen.queryByText("Bo")).not.toBeInTheDocument());
    expect(pill()).toBe("1");
  });
});

/** The empty state has to distinguish "no data" from "no matches" in the cards body too,
    where the placeholders are their own component. */
describe("the cards empty state", () => {
  const cardsProps = { card: (r: Row) => <span>{r.name}</span>, defaultView: "cards" as const };

  it("offers a way back when a filter emptied the set", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid(cardsProps);
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.type(screen.getByRole("searchbox"), "nothing matches this");
    const reset = await screen.findByRole("button", { name: /clear filters/i });
    await user.click(reset);

    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
  });

  it("shows the plain empty state when there is genuinely no data", async () => {
    render(
      <DataGrid<Row, any>
        title="Plans"
        columns={COLUMNS}
        zodSchema={schema as never}
        initialData={[]}
        emptyLabel="No plans yet"
        {...cardsProps}
      />
    );
    expect(await screen.findByText("No plans yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /clear filters/i })
    ).not.toBeInTheDocument();
  });
});

/** The cards body reads the sorted model, so an order chosen in the list view survives
    the switch. */
describe("switching to cards after sorting", () => {
  it("keeps the order the user chose", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <DataGrid<Row, any>
        title="Plans"
        columns={COLUMNS}
        zodSchema={schema as never}
        initialData={[
          { ...ROWS[0], id: 1, name: "Bo" },
          { ...ROWS[0], id: 2, name: "Ada" },
          { ...ROWS[0], id: 3, name: "Cy" },
        ]}
        card={(r) => <span data-testid="card">{r.name}</span>}
      />
    );
    await waitFor(() => expect(screen.getByText("Bo")).toBeInTheDocument());

    // The header cell holds a button — that is the sort trigger, not the `<th>`.
    await user.click(
      within(screen.getByRole("columnheader", { name: /name/i })).getByRole("button", {
        name: /name/i,
      })
    );
    await waitFor(() => {
      const cells = [...document.querySelectorAll("tbody td:first-child")];
      expect(cells[0]?.textContent).toBe("Ada");
    });

    await user.click(screen.getByRole("button", { name: "Cards view" }));
    await waitFor(() => expect(screen.getAllByTestId("card").length).toBe(3));
    expect(screen.getAllByTestId("card").map((c) => c.textContent)).toEqual([
      "Ada",
      "Bo",
      "Cy",
    ]);
  });
});

/** Sanity on the inline container, which renders its form inside the table body. */
describe("the inline edit container", () => {
  it("spans the table without adding a column", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ editContainer: "inline" });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    const cols = document.querySelectorAll("colgroup col").length;
    await openEditForm(user);

    const formRow = screen.getByLabelText("Name").closest("tr")!;
    const spans = [...formRow.children].reduce(
      (n, c) => n + Number(c.getAttribute("colspan") ?? 1),
      0
    );
    expect(spans).toBe(cols);
    expect(within(formRow).getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});

/**
 * A validation failure on a key with no rendered field blocks the submit while nothing on
 * screen turns red — the form just refuses to save, with no way to find out why.
 */
describe("a validation error with no field to show it on", () => {
  const cols: WithMeta<Row, any>[] = [
    { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
    {
      accessorKey: "tier",
      header: "Tier",
      // Carried by the form, never rendered: the value comes from the row and the user
      // has no control to correct it with.
      meta: { label: "Tier", editor: "text", visibleInForm: false },
    },
  ];
  const strict = z.object({ name: z.string().min(1), tier: z.string().min(20) });

  it("reports it above the fields", async () => {
    const user = userEvent.setup({ delay: null });
    const onPersist = vi.fn();
    render(
      <DataGrid<Row, any>
        title="Plans"
        columns={cols}
        zodSchema={strict as never}
        initialData={ROWS}
        onPersist={onPersist}
      />
    );
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await screen.findByLabelText("Name");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/tier/i);
    expect(onPersist).not.toHaveBeenCalled();
  });
});
