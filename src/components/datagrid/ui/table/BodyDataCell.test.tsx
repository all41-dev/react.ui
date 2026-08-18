import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataGrid } from "../../DataGrid";
import type { WithMeta } from "../../types/column";

/*
 * The cell measures clipping on `focusin`, which bubbles from the cell-edit button to
 * the `<td>` — a keyboard user whose accessible name is the clipped text has no other
 * way to read the rest of it. The tooltip must appear on focus, and only when the
 * content is actually clipped.
 */

type Row = { id: number; name: string };

const ROWS: Row[] = [{ id: 1, name: "Leanne" }];

const schema = z.object({ name: z.string() });

const COLUMNS: WithMeta<Row, Record<string, unknown>>[] = [
  {
    accessorKey: "name",
    header: "Name",
    meta: { label: "Name", editor: "text", cellEdit: true },
  },
];

function renderGrid() {
  return render(
    <DataGrid<Row, Record<string, unknown>>
      title="Rows"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={ROWS}
      onPersist={vi.fn()}
    />
  );
}

/* The test setup gives every element clientWidth 1200 and jsdom reports scrollWidth 0,
   so nothing measures as clipped by default; this makes everything measure as clipped. */
function clipEverything() {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get: () => 5000,
  });
}

afterEach(() => {
  delete (HTMLElement.prototype as { scrollWidth?: number }).scrollWidth;
});

describe("cell tooltip on keyboard focus", () => {
  it("focusing the cell-edit button attaches the tooltip to clipped content", async () => {
    clipEverything();
    renderGrid();

    const button = await screen.findByRole("button", { name: "Leanne" });
    const content = screen.getByText("Leanne");
    expect(content).not.toHaveAttribute("data-tooltip-content");

    act(() => button.focus());
    expect(button).toHaveFocus();

    await waitFor(() =>
      expect(content).toHaveAttribute("data-tooltip-content", "Leanne")
    );
  });

  it("leaves unclipped content without a tooltip after focus", async () => {
    renderGrid();

    const button = await screen.findByRole("button", { name: "Leanne" });
    act(() => button.focus());
    expect(button).toHaveFocus();

    expect(screen.getByText("Leanne")).not.toHaveAttribute("data-tooltip-content");
  });
});
