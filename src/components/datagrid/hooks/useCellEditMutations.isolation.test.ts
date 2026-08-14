import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { WithMeta } from "../types/column";
import type { useEditSession } from "./useEditSession";
import { useCellEditMutations } from "./useCellEditMutations";

/**
 * A cell commit validates the whole row but must only report the issues belonging to the
 * field being edited: a stored value that fails somewhere else is not something the user
 * can fix from a one-field popover.
 */

type Row = {
  id: number;
  name: string;
  note: string;
  user: { name: string; email: string };
};

/** Both `note` and `user.email` hold values the schema below rejects. */
const ROW: Row = {
  id: 1,
  name: "Leanne",
  note: "too long for the rule",
  user: { name: "Leanne", email: "not-an-email" },
};

const schema = z.object({
  name: z.string().min(1),
  note: z.string().max(3),
  user: z.object({ name: z.string().min(1), email: z.email() }),
});

const COLUMNS: WithMeta<Row, any>[] = [
  { accessorKey: "name", header: "Name", meta: { editor: "text", cellEdit: true } },
  { accessorKey: "note", header: "Note" },
  { accessorKey: "user.name", header: "User", meta: { editor: "text", cellEdit: true } },
  { accessorKey: "user.email", header: "Email" },
];

function session(columnId: string) {
  return {
    cell: {
      kind: "cell",
      row: ROW,
      columnId,
      anchor: { top: 0, bottom: 0, left: 0, width: 0 },
    },
    startCellEdit: vi.fn(),
    close: vi.fn(),
  } as unknown as ReturnType<typeof useEditSession<Row>>;
}

/** `columnId` is the TanStack id — dots become underscores. */
function setup(columnId: string) {
  const onPersist = vi.fn<
    (mode: string, values: Record<string, unknown>, prev?: Row) => Promise<Row>
  >(async () => ROW);
  const { result } = renderHook(() =>
    useCellEditMutations<Row, any>({
      columns: COLUMNS,
      zodSchema: schema as never,
      onPersist,
      edit: session(columnId),
      replaceRow: vi.fn(),
    })
  );
  return { result, onPersist };
}

describe("cell-edit validation is scoped to the edited field", () => {
  it("refuses a value the edited field's own rule rejects", async () => {
    const { result, onPersist } = setup("name");
    await expect(result.current.handleCellSave("")).rejects.toThrow();
    expect(onPersist).not.toHaveBeenCalled();
  });

  it("saves a flat field despite another field the schema rejects", async () => {
    const { result, onPersist } = setup("name");
    await result.current.handleCellSave("Ervin");
    expect(onPersist).toHaveBeenCalled();
  });

  /*
   * Same contract, nested key. The issue is matched by its FIRST path segment, which
   * every sibling under the same root shares — so an unrelated stored value blocks an
   * edit the flat-key path above lets through.
   */
  it("saves a nested field despite an invalid sibling under the same root", async () => {
    const { result, onPersist } = setup("user_name");
    await result.current.handleCellSave("Ervin");
    expect(onPersist).toHaveBeenCalled();
  });
});

/**
 * The complement of the scoping above: narrowing the match must not lose the issues that
 * DO belong to the field, or a value the schema rejects saves silently.
 */
describe("the edited field's own issues still surface", () => {
  it("refuses a nested field's own rule", async () => {
    const { result, onPersist } = setup("user_name");
    await expect(result.current.handleCellSave("")).rejects.toThrow();
    expect(onPersist).not.toHaveBeenCalled();
  });

  /* A column whose editor owns a whole object: an issue on one of that object's members
     is the only place it can be reported. */
  it("reports a member's issue for a column that edits the whole object", async () => {
    const onPersist = vi.fn<
      (mode: string, values: Record<string, unknown>, prev?: Row) => Promise<Row>
    >(async () => ROW);
    const { result } = renderHook(() =>
      useCellEditMutations<Row, any>({
        columns: [
          { accessorKey: "name", header: "Name" },
          { accessorKey: "note", header: "Note" },
          { accessorKey: "user", header: "User", meta: { editor: "code", cellEdit: true } },
        ] as WithMeta<Row, any>[],
        zodSchema: schema as never,
        onPersist,
        edit: session("user"),
        replaceRow: vi.fn(),
      })
    );

    await expect(
      result.current.handleCellSave({ name: "Ada", email: "still-not-an-email" })
    ).rejects.toThrow(/email/i);
    expect(onPersist).not.toHaveBeenCalled();
  });
});
