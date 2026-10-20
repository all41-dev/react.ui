import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { DataGrid } from "./DataGrid";
import type { WithMeta } from "./types/column";
import { bodyHeightClass } from "./ui/bodyHeight";

type Row = { id: number; name: string };

const ROWS: Row[] = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Bo" },
];

const COLUMNS: WithMeta<Row, { name: string }>[] = [{ accessorKey: "name", header: "Name" }];

const schema = z.object({ name: z.string() });

function renderGrid(fill?: boolean) {
  render(
    <DataGrid<Row, { name: string }>
      title="People"
      columns={COLUMNS}
      zodSchema={schema}
      initialData={ROWS}
      editContainer="none"
      fill={fill}
    />
  );
  // The table's scroll box is the grid element's nearest scrolling ancestor.
  const scroller = screen.getByRole("grid").closest(".overflow-y-auto");
  if (!scroller) throw new Error("no scroll box");
  return scroller as HTMLElement;
}

describe("DataGrid fill", () => {
  it("caps the body at 70% of the viewport by default", () => {
    const scroller = renderGrid();
    expect(scroller).toHaveClass("max-h-[70vh]");
    expect(scroller).not.toHaveClass("flex-1");
  });

  it("takes the container's height and scrolls inside it", () => {
    const scroller = renderGrid(true);
    expect(scroller).toHaveClass("min-h-0", "flex-1");
    expect(scroller).not.toHaveClass("max-h-[70vh]");
    // Every box between the scroller and the root flexes, or the scroller has no height to take.
    const body = scroller.parentElement!;
    expect(body).toHaveClass("flex", "min-h-0", "flex-1", "flex-col");
    expect(body.parentElement).toHaveClass("h-full", "flex-col", "min-h-0");
  });

  it("gives the cards and kanban views the same rule", () => {
    expect(bodyHeightClass(undefined)).toBe("max-h-[70vh]");
    expect(bodyHeightClass(true)).toBe("min-h-0 flex-1");
  });
});
