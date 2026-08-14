import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";

import { useColumnLayout } from "./useColumnLayout";
import { Colgroup } from "../ui/table/Colgroup";
import { TableHead } from "../ui/table/TableHead";

type Row = { name: string; role: string; joined: string };

const DEFS: Record<string, ColumnDef<Row, any>> = {
  name: { id: "name", accessorKey: "name", header: "Name" },
  role: { id: "role", accessorKey: "role", header: "Role" },
  joined: { id: "joined", accessorKey: "joined", header: "Joined" },
};

const DATA: Row[] = [{ name: "a", role: "b", joined: "c" }];

const CONTAINER_W = 1200;

/**
 * The parts of the grid that decide column widths, driven directly.
 *
 * `columns` is rebuilt from the order on purpose — that is what `useGridColumns` does, and
 * it is what makes TanStack replace every `Column` instance on a reorder.
 */
function Harness() {
  const [order, setOrder] = useState(["name", "role", "joined"]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});

  const columns = useMemo(() => order.map((id) => DEFS[id]), [order]);

  // eslint-disable-next-line react-hooks/incompatible-library -- matches `useDataGridTable`.
  const table = useReactTable({
    data: DATA,
    columns,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { enableResizing: true, minSize: 40, size: 150, maxSize: 1000 },
    columnResizeMode: "onChange",
    state: { columnOrder: order, columnVisibility: visibility },
    onColumnOrderChange: setOrder as never,
    onColumnVisibilityChange: setVisibility as never,
  });

  const { leafColsAll, lastDataColId, lastColWidth, tableW } = useColumnLayout(
    table,
    CONTAINER_W
  );

  return (
    <>
      <button onClick={() => setVisibility({ role: false })}>hide role</button>
      {/* Swaps name and role. While role is hidden the VISIBLE id list is unchanged. */}
      <button onClick={() => setOrder(["role", "name", "joined"])}>swap</button>
      <table data-testid="grid" style={{ width: `${tableW}px` }}>
        <Colgroup
          leafColsAll={leafColsAll}
          lastDataColId={lastDataColId}
          lastColWidth={lastColWidth}
        />
        <TableHead
          table={table}
          headRef={null}
          lastDataColId={lastDataColId}
          lastColWidth={lastColWidth}
        />
      </table>
    </>
  );
}

const colWidths = () =>
  Array.from(document.querySelectorAll("colgroup col")).map(
    (c) => (c as HTMLElement).style.width
  );

const declaredTableWidth = () => screen.getByTestId("grid").style.width;

describe("useColumnLayout", () => {
  it("stretches the final data column to fill the container", () => {
    render(<Harness />);
    expect(colWidths()).toEqual(["150px", "150px", "900px"]);
    expect(declaredTableWidth()).toBe(`${CONTAINER_W}px`);
  });

  it("keeps the stretch through a reorder that hides its own id change", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByText("hide role"));
    expect(colWidths()).toEqual(["150px", "1050px"]);

    /* The visible id list is identical across this reorder, so anything cached on it
       keeps returning column instances the table has already discarded. */
    await user.click(screen.getByText("swap"));
    expect(colWidths()).toEqual(["150px", "1050px"]);
    expect(declaredTableWidth()).toBe(`${CONTAINER_W}px`);
  });

  it("always covers every visible column, so the browser never redistributes width", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("hide role"));
    await user.click(screen.getByText("swap"));

    const sum = colWidths().reduce((n, w) => n + parseFloat(w), 0);
    expect(sum).toBe(CONTAINER_W);
  });
});

describe("resizing the stretched column", () => {
  it("steps from the painted width, not the model width", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(colWidths()).toEqual(["150px", "150px", "900px"]);

    const resizer = screen.getByRole("separator", { name: /resize joined/i });
    resizer.focus();
    await user.keyboard("{ArrowRight}");

    expect(colWidths()).toEqual(["150px", "150px", "916px"]);
  });

  it("reports the painted width to assistive tech", () => {
    render(<Harness />);
    expect(
      screen.getByRole("separator", { name: /resize joined/i })
    ).toHaveAttribute("aria-valuenow", "900");
  });

  it("gives the width back on Home", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const resizer = screen.getByRole("separator", { name: /resize joined/i });
    resizer.focus();
    await user.keyboard("{ArrowLeft}");
    expect(colWidths()).toEqual(["150px", "150px", "884px"]);

    await user.keyboard("{Home}");
    expect(colWidths()).toEqual(["150px", "150px", "900px"]);
  });

  it("tracks the pointer 1:1 from where the edge is painted", async () => {
    render(<Harness />);
    const resizer = screen.getByRole("separator", { name: /resize joined/i });

    fireEvent.mouseDown(resizer, { clientX: 1200 });
    fireEvent.mouseMove(document, { clientX: 1100 });
    expect(colWidths()).toEqual(["150px", "150px", "800px"]);

    fireEvent.mouseMove(document, { clientX: 1160 });
    expect(colWidths()).toEqual(["150px", "150px", "860px"]);

    fireEvent.mouseUp(document, { clientX: 1160 });
    fireEvent.mouseMove(document, { clientX: 400 });
    expect(colWidths()).toEqual(["150px", "150px", "860px"]);
  });

  it("steps from a painted width past maxSize instead of snapping to it", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Hiding a column stretches the last one past its maxSize of 1000.
    await user.click(screen.getByText("hide role"));
    expect(colWidths()).toEqual(["150px", "1050px"]);

    const resizer = screen.getByRole("separator", { name: /resize joined/i });
    resizer.focus();
    await user.keyboard("{ArrowLeft}");

    expect(colWidths()).toEqual(["150px", "1034px"]);
  });

  it("stops resizing when the touch is cancelled", () => {
    render(<Harness />);
    const resizer = screen.getByRole("separator", { name: /resize joined/i });

    fireEvent.touchStart(resizer, { touches: [{ clientX: 1200 }] });
    fireEvent.touchMove(document, { touches: [{ clientX: 1100 }] });
    expect(colWidths()).toEqual(["150px", "150px", "800px"]);

    fireEvent.touchCancel(document);
    fireEvent.touchMove(document, { touches: [{ clientX: 400 }] });
    expect(colWidths()).toEqual(["150px", "150px", "800px"]);
  });

  it("leaves an unstretched column stepping from its own size", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const resizer = screen.getByRole("separator", { name: /resize name/i });
    resizer.focus();
    await user.keyboard("{ArrowRight}");

    // name grows by the step; the last column gives the width back
    expect(colWidths()).toEqual(["166px", "150px", "884px"]);
  });
});
