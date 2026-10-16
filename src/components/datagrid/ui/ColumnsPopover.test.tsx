import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColumnsPopover } from "./ColumnsPopover";

type Row = { id: string; name: string; role: string };

const COLUMNS: ColumnDef<Row, unknown>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  { id: "role", accessorKey: "role", header: "Role" },
];

function Host({ presentation }: { presentation?: "toolbar" | "menu" }) {
  // eslint-disable-next-line react-hooks/incompatible-library -- a test host, never memoized
  const table = useReactTable({
    data: [],
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    initialState: { columnVisibility: { role: false } },
  });
  return <ColumnsPopover table={table} onReset={vi.fn()} presentation={presentation} />;
}

describe("ColumnsPopover presentations", () => {
  it("is the toolbar button by default, with the label hidden under sm", () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: /^Columns/ });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger.querySelector('[class~="sm:inline"]')).toBeTruthy();
  });

  it("is a full-width row in the menu, under the same name", () => {
    render(<Host presentation="menu" />);
    const trigger = screen.getByRole("button", { name: /^Columns/ });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger.className).toContain("w-full");
    // The label is never hidden in the panel, whatever the viewport.
    expect(trigger.querySelector('[class~="sm:inline"]')).toBeNull();
  });
});
