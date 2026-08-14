import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { WithMeta } from "../types/column";
import type { useEditSession } from "./useEditSession";
import { useCellEditMutations } from "./useCellEditMutations";

type Row = { id: number; name: string; note: string };

const schema = z.object({
  name: z.string().min(1),
  note: z.string(),
});

/** An open cell session on `row`, targeting the column TanStack ids as `columnId`. */
function session(row: Row, columnId: string) {
  return {
    cell: { kind: "cell", row, columnId, anchor: { top: 0, bottom: 0, left: 0, width: 0 } },
    startCellEdit: vi.fn(),
    close: vi.fn(),
  } as unknown as ReturnType<typeof useEditSession<Row>>;
}

function setup(columns: WithMeta<Row, any>[], columnId: string) {
  const row: Row = { id: 1, name: "Leanne", note: "hi" };
  const onPersist =
    vi.fn<(mode: string, values: Record<string, unknown>, prev?: Row) => Promise<Row>>(
      async () => row
    );
  const { result } = renderHook(() =>
    useCellEditMutations<Row, any>({
      columns,
      zodSchema: schema as never,
      onPersist,
      edit: session(row, columnId),
      replaceRow: vi.fn(),
    })
  );
  return { result, onPersist };
}

describe("useCellEditMutations", () => {
  /*
   * The commit is keyed by the column's ACCESSOR KEY. Keying it by the column id put the
   * edited value under `nameCol`, which the schema stripped as unknown — so the save went
   * through carrying the unchanged `name` and the popover closed as if it had worked.
   */
  it("writes under the accessor key when the column also declares an id", async () => {
    const columns: WithMeta<Row, any>[] = [
      { id: "nameCol", accessorKey: "name", header: "Name", meta: { editor: "text" } },
      { accessorKey: "note", header: "Note" },
    ];
    const { result, onPersist } = setup(columns, "nameCol");

    await result.current.handleCellSave("Ervin");

    expect(onPersist).toHaveBeenCalledWith(
      "cell",
      expect.objectContaining({ name: "Ervin" }),
      expect.anything()
    );
  });

  it("posts only the fields the columns declare", async () => {
    const columns: WithMeta<Row, any>[] = [
      { accessorKey: "name", header: "Name", meta: { editor: "text" } },
      { accessorKey: "note", header: "Note" },
    ];
    const { result, onPersist } = setup(columns, "name");

    await result.current.handleCellSave("Ervin");

    // `id` is a row field with no column: seeding the form from the whole row would
    // post it back along with every other undeclared field the row carries.
    expect(onPersist.mock.calls[0][1]).toEqual({ name: "Ervin", note: "hi" });
  });

  it("applies `fromForm` on a column that has no editor", async () => {
    const columns: WithMeta<Row, any>[] = [
      { accessorKey: "name", header: "Name", meta: { editor: "text" } },
      {
        accessorKey: "note",
        header: "Note",
        meta: { fromForm: (v) => `${String(v)}!` },
      },
    ];
    const { result, onPersist } = setup(columns, "name");

    await result.current.handleCellSave("Ervin");

    expect(onPersist.mock.calls[0][1]).toMatchObject({ note: "hi!" });
  });
});
