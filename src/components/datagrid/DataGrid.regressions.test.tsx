import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridProps } from "./DataGrid";
import type { WithMeta } from "./types/column";

type User = { id: number; name: string };

const USERS: User[] = [
  { id: 1, name: "Clementine" },
  { id: 2, name: "Ervin" },
  { id: 3, name: "Bauch" },
  { id: 4, name: "Leanne" },
  { id: 5, name: "Patricia" },
];

const schema = z.object({ name: z.string().min(1) });

const COLUMNS: WithMeta<User, any>[] = [
  {
    accessorKey: "name",
    header: "Name",
    meta: { label: "Name", editor: "text", filter: { type: "text" } },
  },
];

const renderGrid = (props: Partial<DataGridProps<User, any>> = {}) =>
  render(
    <DataGrid<User, any>
      title="Users"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={USERS}
      {...props}
    />
  );

/**
 * The cards body reads the SORTED row model. Reaching past the page slice to render the
 * whole filtered set is deliberate, but the filtered model is pre-sort — taking it there
 * dropped `initialSorting` and every header sort without a trace.
 */
describe("cards view sorting", () => {
  it("honours initialSorting", async () => {
    renderGrid({
      card: (r) => <span data-testid="card-name">{r.name}</span>,
      defaultView: "cards",
      initialSorting: [{ id: "name", desc: false }],
    });

    await screen.findAllByTestId("card-name");
    const names = screen
      .getAllByTestId("card-name")
      .map((el) => el.textContent ?? "");

    // Only the virtualizer's first window is mounted, so this checks the head of the
    // list: "Clementine" is what declaration order would have put there.
    expect(names[0]).toBe("Bauch");
    expect(names).toEqual([...names].sort());
  });
});

/**
 * Showing the filter row must not move the user off their page. The text filter's effect
 * fires on mount with nothing to apply, and TanStack's auto-remove branch returns a fresh
 * array even when it removes nothing — which reads downstream as a real filter change.
 */
describe("filter row", () => {
  it("does not reset the page when it is shown", async () => {
    // No inter-event delay: three clicks at userEvent's default pacing put this over the
    // 5s timeout whenever the suite runs under load.
    const user = userEvent.setup({ delay: null });
    renderGrid({ pagination: { enabled: true, initialState: { pageSize: 2 } } });

    await user.click(screen.getByRole("button", { name: /next page/i }));
    const pager = screen.getByRole("navigation");
    expect(within(pager).getByRole("button", { current: "page" })).toHaveTextContent("2");

    // Filters, Columns and Group-by live behind the toolbar's overflow menu.
    await user.click(
      screen.getByRole("button", { name: /filters, columns and grouping/i })
    );
    await user.click(screen.getByRole("switch", { name: /filter row/i }));

    expect(await screen.findByRole("textbox", { name: /filter by name/i })).toBeVisible();
    expect(within(pager).getByRole("button", { current: "page" })).toHaveTextContent("2");
  });
});
