import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

describe("ColumnsPopover with a lead column", () => {
  const WIDE: ColumnDef<Row, unknown>[] = [
    ...COLUMNS,
    { id: "id", accessorKey: "id", header: "Id" },
  ];

  function Ordered({ onOrder }: { onOrder: (order: string[]) => void }) {
    const [columnOrder, setColumnOrder] = useState(["name", "role", "id"]);
    // eslint-disable-next-line react-hooks/incompatible-library -- a test host, never memoized
    const table = useReactTable({
      data: [],
      columns: WIDE,
      getCoreRowModel: getCoreRowModel(),
      state: { columnOrder },
      onColumnOrderChange: (updater) => {
        const next = typeof updater === "function" ? updater(columnOrder) : updater;
        setColumnOrder(next);
        onOrder(next);
      },
    });
    return <ColumnsPopover table={table} onReset={vi.fn()} leadColumnId="name" />;
  }

  it("lists the lead column and offers no move on it or past it", async () => {
    const user = userEvent.setup();
    const onOrder = vi.fn();
    render(<Ordered onOrder={onOrder} />);
    await user.click(screen.getByRole("button", { name: /^Columns/ }));

    expect(screen.getByRole("checkbox", { name: "Name" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move Name earlier" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Name later" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Role earlier" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Move Role later" }));
    expect(onOrder).toHaveBeenLastCalledWith(["name", "id", "role"]);
  });
});
