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

const describedColumns = (): WithMeta<Row, any>[] => [
  {
    ...COLUMNS[0],
    meta: { ...COLUMNS[0].meta, description: "Shown to the customer" },
  },
  ...COLUMNS.slice(1),
];

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

  it("keeps the description in aria-describedby alongside the error", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ columns: describedColumns() });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await save(user);

    const alert = await screen.findByRole("alert");
    // The sr-only description never disappears, so it must stay referenced — error first.
    expect(name.getAttribute("aria-describedby")).toBe(
      `${alert.id} ${name.id}-desc`
    );
  });
});

describe("the field description", () => {
  it("renders as a tooltip icon next to the label, not as a hint line", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ columns: describedColumns() });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    const name = screen.getByLabelText("Name");
    const desc = screen.getByText("Shown to the customer");
    // The only rendering of the text is the sr-only span aria-describedby points at.
    expect(desc).toHaveClass("sr-only");
    expect(name.getAttribute("aria-describedby")).toBe(desc.id);

    const anchor = desc.closest("[data-tooltip-id]")!;
    expect(anchor).toHaveAttribute(
      "data-tooltip-content",
      "Shown to the customer"
    );
    // Focusable so the tooltip opens for keyboard users too.
    expect(anchor).toHaveAttribute("tabindex", "0");
  });

  // By the anchor attribute: while the tooltip is open its content duplicates the
  // sr-only span's text, so a text query would match both.
  const descriptionAnchor = () =>
    document.querySelector(
      '[data-tooltip-content="Shown to the customer"]'
    ) as HTMLElement;

  /* react-tooltip registers new anchors from a rAF-batched MutationObserver, so a
     hover fired right after the form opens can precede the listeners — retry it. */
  const hoverUntilTooltip = (user: ReturnType<typeof userEvent.setup>) =>
    waitFor(async () => {
      await user.unhover(descriptionAnchor());
      await user.hover(descriptionAnchor());
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    });

  /* Attribute assertions alone can't tell a live anchor from one pointing at a
     tooltip id nothing renders — only an actual open proves the wiring. */
  it("shows the description in the grid tooltip on hover, and hides it again", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ columns: describedColumns() });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    await hoverUntilTooltip(user);
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Shown to the customer"
    );

    await user.unhover(descriptionAnchor());
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    );
  });

  /* Inline container: the overlay's focus trap can't count focusables in jsdom
     (getClientRects is empty there) and swallows Tab, which a browser doesn't. */
  it("shows the tooltip on keyboard focus and hides it on blur", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ columns: describedColumns(), editContainer: "inline" });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    // Hover once so the anchor is registered, then put the tooltip away again.
    await hoverUntilTooltip(user);
    await user.unhover(descriptionAnchor());
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    );

    // The icon precedes the control in the DOM, so shift-tab from the input lands on it.
    await user.click(screen.getByLabelText("Name"));
    // react-tooltip's show handler is a leading-edge debounce with a 50ms cooldown and
    // no trailing call: the click's own focusin consumed the edge, and a focus landing
    // inside the cooldown is dropped, not deferred. Let the fixed cooldown lapse.
    await new Promise((resolve) => setTimeout(resolve, 60));
    await user.tab({ shift: true });

    expect(descriptionAnchor()).toHaveFocus();
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Shown to the customer");

    await user.tab({ shift: true });
    expect(descriptionAnchor()).not.toHaveFocus();
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    );
  });

  /* The tooltip instance mounts once per grid, outside the edit containers — the icon
     must reach it from every container, not only the default panel. */
  for (const editContainer of ["modal", "bottom"] as const) {
    it(`opens the same grid tooltip from the ${editContainer} container`, async () => {
      const user = userEvent.setup({ delay: null });
      renderGrid({ columns: describedColumns(), editContainer });
      await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
      await openEditForm(user);

      await hoverUntilTooltip(user);
      expect(screen.getByRole("tooltip")).toHaveTextContent(
        "Shown to the customer"
      );
    });
  }

  /* WCAG 1.4.13: focus-triggered content must be dismissable without moving focus.
     react-tooltip defaults `globalCloseEvents.escape` to false; the grid opts in. */
  it("hides the tooltip on Escape without moving focus", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ columns: describedColumns(), editContainer: "inline" });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    // Register the anchor, then put the tooltip away again.
    await hoverUntilTooltip(user);
    await user.unhover(descriptionAnchor());
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    );

    await user.click(screen.getByLabelText("Name"));
    // Same leading-edge 50ms show-debounce as the focus test above.
    await new Promise((resolve) => setTimeout(resolve, 60));
    await user.tab({ shift: true });
    expect(descriptionAnchor()).toHaveFocus();
    await screen.findByRole("tooltip");

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    );
    expect(descriptionAnchor()).toHaveFocus();
  });

  /* The overlay containers cancel the edit on any Escape that is not defaultPrevented.
     While the tooltip is open, the first Escape must dismiss only the tooltip — not
     throw the user's edits away underneath it. */
  it("keeps the modal form open when Escape dismisses the tooltip", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ columns: describedColumns(), editContainer: "modal" });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    await user.type(screen.getByLabelText("Name"), "!");

    // Register the anchor, then put the tooltip away again.
    await hoverUntilTooltip(user);
    await user.unhover(descriptionAnchor());
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    );

    // Same leading-edge 50ms show-debounce as the focus test above. The focus trap
    // swallows Tab in jsdom (getClientRects is empty), so focus the anchor directly.
    await new Promise((resolve) => setTimeout(resolve, 60));
    descriptionAnchor().focus();
    // The element renders ahead of the visible-open state the Escape guard reads;
    // only the `react-tooltip__show` class marks the tooltip actually open.
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveClass("react-tooltip__show")
    );

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Ada!");

    // With the tooltip closed, Escape reaches the container again and cancels.
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });

  /* The trap filters candidates by `getClientRects`, which jsdom leaves empty for every
     element — without a box it rejects them all and falls back to the dialog itself. */
  const giveElementsABox = () =>
    vi
      .spyOn(Element.prototype, "getClientRects")
      .mockReturnValue([{ width: 10, height: 10 }] as unknown as DOMRectList);

  /* The icon precedes its control in the DOM and carries `tabindex="0"`, so a focus trap
     seeded from the first focusable node opens the form on an info icon — and, since
     focus is one of react-tooltip's open events, greets the user with a tooltip over the
     field they came to fill in. */
  for (const editContainer of ["right", "modal", "bottom"] as const) {
    it(`opens the ${editContainer} container on the first field, not its icon`, async () => {
      const user = userEvent.setup({ delay: null });
      giveElementsABox();
      renderGrid({ columns: describedColumns(), editContainer });
      await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
      await openEditForm(user);

      await waitFor(() => expect(screen.getByLabelText("Name")).toHaveFocus());
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  }

  it("renders no icon and no tab stop without a description", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    await openEditForm(user);

    const form = screen.getByLabelText("Name").closest("form")!;
    expect(form.querySelector("[data-tooltip-id]")).toBeNull();
    expect(screen.getByLabelText("Name")).not.toHaveAttribute(
      "aria-describedby"
    );
  });

  it("gives the switch editor the same icon instead of a hint line", async () => {
    type FlagRow = { id: number; active: boolean };
    const user = userEvent.setup({ delay: null });
    render(
      <DataGrid<FlagRow, any>
        title="Flags"
        columns={[
          {
            accessorKey: "active",
            header: "Active",
            meta: {
              label: "Active",
              editor: "switch",
              description: "Toggles visibility",
            },
          } as WithMeta<FlagRow, any>,
        ]}
        zodSchema={z.object({ active: z.boolean() }) as never}
        initialData={[{ id: 1, active: true }]}
        onPersist={vi.fn()}
      />
    );
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    const toggle = await screen.findByLabelText("Active");
    const desc = screen.getByText("Toggles visibility");
    expect(desc).toHaveClass("sr-only");
    expect(toggle.getAttribute("aria-describedby")).toBe(desc.id);

    const anchor = desc.closest("[data-tooltip-id]")!;
    expect(anchor).toHaveAttribute(
      "data-tooltip-content",
      "Toggles visibility"
    );
    expect(anchor).toHaveAttribute("tabindex", "0");
    // Outside the <label>: a click on the icon must not toggle the switch.
    expect(anchor.closest("label")).toBeNull();
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

/**
 * `meta.formLayout.group` collects fields into a captioned section. `groupSpan` sizes the
 * section in the form grid; `colSpan` sizes a field inside its own section.
 */
describe("field groups in the edit form", () => {
  const GROUPED: WithMeta<Row, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: { label: "Name", editor: "text", formLayout: { group: "identity" } },
    },
    {
      accessorKey: "quota",
      header: "Quota",
      meta: {
        label: "Quota",
        editor: "number",
        formLayout: { group: "limits", colSpan: "full" },
      },
    },
    {
      accessorKey: "tier",
      header: "Tier",
      meta: { label: "Tier", editor: "select", options: TIERS },
    },
  ];

  const group = (id: string) =>
    document.querySelector<HTMLElement>(`[data-form-group="${id}"]`)!;

  it("renders a section per group, headed and holding only its own fields", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({
      columns: GROUPED,
      formLayout: {
        groups: [
          { id: "identity", label: "Identity" },
          { id: "limits", label: "Limits" },
        ],
      },
    });
    await openEditForm(user);

    // A fieldset/legend, so a screen reader names the section with each control in it.
    expect(group("identity").tagName).toBe("FIELDSET");
    expect(screen.getByRole("group", { name: "Identity" })).toBe(group("identity"));
    expect(within(group("identity")).getByLabelText("Name")).toBeInTheDocument();
    expect(within(group("limits")).getByLabelText("Quota")).toBeInTheDocument();
    // Ungrouped fields stay loose in the form grid.
    expect(screen.getByLabelText("Tier").closest("[data-form-group]")).toBeNull();
  });

  it("spans the section by `groupSpan` and its fields by `colSpan`", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({
      columns: GROUPED,
      formLayout: {
        columns: 4,
        groups: [{ id: "limits", label: "Limits", groupSpan: 2 }],
      },
    });
    await openEditForm(user);

    const limits = group("limits");
    // Spans track the grid's breakpoint; the grid itself is one track below `md`.
    expect(limits).toHaveClass("col-span-1", "md:col-span-2");
    // Defaulted from the span, so the fields keep the form's column rhythm.
    expect(limits.querySelector(".grid")).toHaveClass("md:grid-cols-2");
    expect(screen.getByLabelText("Quota").closest(".rui-field")).toHaveClass(
      "col-span-full"
    );
  });

  it("keeps a switch in the group it names, out of Options", async () => {
    type FlagRow = { id: number; active: boolean; archived: boolean };
    const user = userEvent.setup({ delay: null });
    render(
      <DataGrid<FlagRow, any>
        title="Flags"
        columns={[
          {
            accessorKey: "active",
            header: "Active",
            meta: {
              label: "Active",
              editor: "switch",
              formLayout: { group: "access" },
            },
          },
          {
            accessorKey: "archived",
            header: "Archived",
            meta: { label: "Archived", editor: "switch" },
          },
        ] as WithMeta<FlagRow, any>[]}
        zodSchema={z.object({ active: z.boolean(), archived: z.boolean() }) as never}
        initialData={[{ id: 1, active: true, archived: false }]}
        onPersist={vi.fn()}
      />
    );
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await screen.findByLabelText("Active");

    expect(within(group("access")).getByLabelText("Active")).toBeInTheDocument();
    expect(within(group("options")).getByLabelText("Archived")).toBeInTheDocument();
    expect(within(group("options")).getByText("Options")).toBeInTheDocument();
  });

  it("does not collide a column's key with a group of the same name", async () => {
    type OptRow = { id: number; options: string; archived: boolean };
    const user = userEvent.setup({ delay: null });
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <DataGrid<OptRow, any>
        title="Keys"
        columns={[
          {
            accessorKey: "options",
            header: "Options",
            meta: { label: "Options text", editor: "text" },
          },
          {
            accessorKey: "archived",
            header: "Archived",
            meta: { label: "Archived", editor: "switch" },
          },
        ] as WithMeta<OptRow, any>[]}
        zodSchema={
          z.object({ options: z.string(), archived: z.boolean() }) as never
        }
        initialData={[{ id: 1, options: "a", archived: false }]}
        onPersist={vi.fn()}
      />
    );
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await screen.findByLabelText("Options text");

    // The loose field and the implicit Options section render side by side.
    expect(screen.getByLabelText("Options text").closest("[data-form-group]")).toBeNull();
    expect(within(group("options")).getByLabelText("Archived")).toBeInTheDocument();
    expect(
      warn.mock.calls.some((args) => String(args[0]).includes("same key"))
    ).toBe(false);
    warn.mockRestore();
  });
});

/**
 * A switch takes its layout from the section it sits in: the chip form in a `"cards"`
 * section, and the plain editors' label-over-control stack everywhere else, so it lines
 * up with the inputs beside it on a form row.
 */
describe("a switch in a grid section", () => {
  type FlagRow = { id: number; active: boolean; archived: boolean };

  const FLAGS: WithMeta<FlagRow, any>[] = [
    {
      accessorKey: "active",
      header: "Active",
      meta: { label: "Active", editor: "switch", formLayout: { group: "access" } },
    },
    { accessorKey: "archived", header: "Archived", meta: { label: "Archived", editor: "switch" } },
  ];

  const openFlags = async (user: ReturnType<typeof userEvent.setup>) => {
    render(
      <DataGrid<FlagRow, any>
        title="Flags"
        columns={FLAGS}
        zodSchema={z.object({ active: z.boolean(), archived: z.boolean() }) as never}
        initialData={[{ id: 1, active: true, archived: false }]}
        onPersist={vi.fn()}
      />
    );
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await screen.findByLabelText("Active");
  };

  it("labels the track from outside it, the way every other field does", async () => {
    const user = userEvent.setup({ delay: null });
    await openFlags(user);

    const grouped = screen.getByLabelText("Active");
    // A `<label for>` sibling, not a wrapper: that is what puts the label on the row
    // above the control instead of beside the track.
    expect(grouped.closest("label")).toBeNull();
    expect(document.querySelector(`label[for="${grouped.id}"]`)).toHaveTextContent(
      "Active"
    );

    // The implicit Options section is still the chip form, with the label inline.
    expect(screen.getByLabelText("Archived").closest("label")).not.toBeNull();
  });

  it("toggles from the track, which is the only part of it a pointer can see", async () => {
    const user = userEvent.setup({ delay: null });
    await openFlags(user);

    // The input is `sr-only`; the track beside it is what the user actually clicks.
    const grouped = screen.getByLabelText("Active");
    const track = grouped.nextElementSibling!;
    expect(track.tagName).toBe("LABEL");

    expect(grouped).toBeChecked();
    await user.click(track);
    expect(grouped).not.toBeChecked();
  });

  it("toggles from the track in a cards section too", async () => {
    const user = userEvent.setup({ delay: null });
    await openFlags(user);

    // Wrapped by the chip label rather than carrying `htmlFor` itself.
    const chip = screen.getByLabelText("Archived");
    const track = chip.nextElementSibling!;
    expect(track.tagName).toBe("SPAN");

    expect(chip).not.toBeChecked();
    await user.click(track);
    expect(chip).toBeChecked();
  });

  it("still toggles from its label", async () => {
    const user = userEvent.setup({ delay: null });
    await openFlags(user);

    const grouped = screen.getByLabelText("Active");
    expect(grouped).toBeChecked();
    await user.click(document.querySelector(`label[for="${grouped.id}"]`)!);
    expect(grouped).not.toBeChecked();
  });
});

/**
 * `meta.hint` says something about the value being edited — a humanised echo of a
 * machine value — under the control and out of the way of an error.
 */
describe("a field hint", () => {
  const HINTED: WithMeta<Row, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      meta: {
        label: "Name",
        editor: "text",
        hint: (value) => `${String(value ?? "").length} characters`,
      },
    },
    {
      accessorKey: "quota",
      header: "Quota",
      meta: {
        label: "Quota",
        editor: "number",
        // Second argument: the live form, not just this field.
        hint: (value, form) => `${(form as { name: string }).name} may open ${value}`,
      },
    },
  ];

  it("re-reads the value as it is typed", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ columns: HINTED });
    await openEditForm(user);

    expect(screen.getByText("3 characters")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Name"), "x");
    expect(screen.getByText("4 characters")).toBeInTheDocument();
  });

  it("sees the rest of the form", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ columns: HINTED });
    await openEditForm(user);

    expect(screen.getByText("Ada may open 5")).toBeInTheDocument();
  });

  /* The switch renders its hint through its own layout rather than through `FieldChrome`,
     with its own error-precedence rule, so the path is pinned separately. */
  it("follows a switch, and gives way to its error", async () => {
    type FlagRow = { id: number; active: boolean };
    const user = userEvent.setup({ delay: null });
    render(
      <DataGrid<FlagRow, any>
        title="Flags"
        columns={[
          {
            accessorKey: "active",
            header: "Active",
            meta: {
              label: "Active",
              editor: "switch",
              hint: (value) => (value ? "Visible to everyone" : "Hidden"),
            },
          } as WithMeta<FlagRow, any>,
        ]}
        zodSchema={
          z.object({
            active: z.boolean().refine((v) => v, "Must stay on"),
          }) as never
        }
        initialData={[{ id: 1, active: true }]}
        onPersist={vi.fn()}
      />
    );
    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    const toggle = await screen.findByLabelText("Active");
    expect(screen.getByText("Visible to everyone")).toBeInTheDocument();
    expect(toggle.getAttribute("aria-describedby")).toBe(`${toggle.id}-hint`);

    await user.click(document.querySelector(`label[for="${toggle.id}"]`)!);
    expect(screen.getByText("Hidden")).toBeInTheDocument();

    await save(user);
    await waitFor(() =>
      expect(document.getElementById(`${toggle.id}-error`)).toBeInTheDocument()
    );
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    expect(toggle.getAttribute("aria-describedby")).toBe(`${toggle.id}-error`);
  });

  it("describes the control, and gives way to the error", async () => {
    const user = userEvent.setup({ delay: null });
    renderGrid({ columns: HINTED });
    await openEditForm(user);

    const name = screen.getByLabelText("Name");
    expect(name.getAttribute("aria-describedby")).toContain(`${name.id}-hint`);

    await user.clear(name);
    await save(user);

    await waitFor(() =>
      expect(document.getElementById(`${name.id}-error`)).toBeInTheDocument()
    );
    expect(screen.queryByText("0 characters")).not.toBeInTheDocument();
  });
});

/** The read side of `DataGridHandle`: a parent can react to a session it did not open. */
describe("onEditStateChange", () => {
  it("reports each session, and reports it once", async () => {
    const user = userEvent.setup({ delay: null });
    const onEditStateChange = vi.fn();
    renderGrid({ onEditStateChange });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    expect(onEditStateChange).not.toHaveBeenCalled();

    await openEditForm(user);
    expect(onEditStateChange).toHaveBeenCalledTimes(1);
    expect(onEditStateChange).toHaveBeenLastCalledWith({
      kind: "edit",
      row: ROWS[0],
    });

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onEditStateChange).toHaveBeenLastCalledWith({ kind: "idle" });
    expect(onEditStateChange).toHaveBeenCalledTimes(2);
  });

  it("reports a create session", async () => {
    const user = userEvent.setup({ delay: null });
    const onEditStateChange = vi.fn();
    renderGrid({ onEditStateChange });
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onEditStateChange).toHaveBeenLastCalledWith({ kind: "create" });
  });

  /* The cell session is the one state that is not reported as the grid holds it: the
     popover's anchor rect is the popover's business and must not reach the consumer. */
  it("reports a cell session without the popover's anchor", async () => {
    const user = userEvent.setup({ delay: null });
    const onEditStateChange = vi.fn();
    renderGrid({
      onEditStateChange,
      columns: [
        {
          accessorKey: "name",
          header: "Name",
          meta: { label: "Name", editor: "text", cellEdit: true },
        } as WithMeta<Row, any>,
      ],
    });

    await user.click(await screen.findByRole("button", { name: "Ada" }));

    expect(onEditStateChange).toHaveBeenCalledTimes(1);
    expect(onEditStateChange).toHaveBeenLastCalledWith({
      kind: "cell",
      row: ROWS[0],
      columnId: "name",
    });

    await user.keyboard("{Escape}");
    expect(onEditStateChange).toHaveBeenLastCalledWith({ kind: "idle" });
  });
});
