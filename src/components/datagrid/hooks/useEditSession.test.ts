import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useEditSession } from "./useEditSession";

type Row = { id: number; name: string };
const rowA: Row = { id: 1, name: "a" };
const rowB: Row = { id: 2, name: "b" };
const anchor = { top: 0, bottom: 20, left: 0, width: 100 };

/**
 * These pin the property the union buys us: the session is a single value, so the
 * contradictory combinations that separate `editing` / `open` / `cellEdit` flags allow
 * cannot be constructed at all.
 */
describe("useEditSession", () => {
  it("starts idle", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    expect(result.current.session.kind).toBe("idle");
    expect(result.current.isFormOpen).toBe(false);
    expect(result.current.editingRow).toBeUndefined();
    expect(result.current.cell).toBeUndefined();
  });

  it("opens a create session", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startCreate());
    expect(result.current.session.kind).toBe("create");
    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.formMode).toBe("create");
    expect(result.current.editingRow).toBeUndefined();
  });

  it("opens an edit session carrying its row", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startEdit(rowA));
    expect(result.current.session.kind).toBe("edit");
    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.formMode).toBe("edit");
    expect(result.current.editingRow).toBe(rowA);
  });

  it("closing clears the form and the row together", () => {
    // Separate flags would let the row go null while the drawer stayed open, which
    // re-renders as a blank Create form.
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startEdit(rowA));
    act(() => result.current.close());
    expect(result.current.session.kind).toBe("idle");
    expect(result.current.isFormOpen).toBe(false);
    expect(result.current.editingRow).toBeUndefined();
  });

  it("never reports a form open without a mode that matches it", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startEdit(rowA));
    expect(result.current.isFormOpen && !!result.current.editingRow).toBe(true);
    act(() => result.current.close());
    expect(result.current.isFormOpen || !!result.current.editingRow).toBe(false);
  });

  it("a cell session is not a form session", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startCellEdit(rowA, "name", anchor));
    expect(result.current.session.kind).toBe("cell");
    expect(result.current.cell).toEqual({
      kind: "cell",
      row: rowA,
      columnId: "name",
      anchor,
    });
    // The overlay containers must stay shut while a cell popover is up.
    expect(result.current.isFormOpen).toBe(false);
    expect(result.current.editingRow).toBeUndefined();
  });

  it("one session at a time — starting another replaces the first", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startEdit(rowA));
    act(() => result.current.startCellEdit(rowB, "name", anchor));
    expect(result.current.session.kind).toBe("cell");
    expect(result.current.editingRow).toBeUndefined();

    act(() => result.current.startCreate());
    expect(result.current.session.kind).toBe("create");
    expect(result.current.cell).toBeUndefined();
  });

  it("a create session carries its seed", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    const seed = { name: "preset" };
    act(() => result.current.startCreate(seed));
    expect(result.current.createSeed).toBe(seed);

    act(() => result.current.startEdit(rowA));
    expect(result.current.createSeed).toBeUndefined();
  });

  it("does not take a click event for a seed", () => {
    // `onClick={startCreate}` calls it with the event, whose fields are not form values.
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startCreate(new MouseEvent("click")));
    expect(result.current.session).toEqual({ kind: "create" });
    expect(result.current.createSeed).toBeUndefined();
  });

  it("closing twice is harmless, and closing while idle is a no-op", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.close());
    expect(result.current.session.kind).toBe("idle");
    act(() => result.current.startEdit(rowA));
    act(() => {
      result.current.close();
      result.current.close();
    });
    expect(result.current.session.kind).toBe("idle");
  });

  it("keeps stable callback identities across renders", () => {
    // They end up inside the action column's context value and as `onCancel` props.
    const { result, rerender } = renderHook(() => useEditSession<Row>());
    const first = {
      startCreate: result.current.startCreate,
      startEdit: result.current.startEdit,
      close: result.current.close,
    };
    rerender();
    expect(result.current.startCreate).toBe(first.startCreate);
    expect(result.current.startEdit).toBe(first.startEdit);
    expect(result.current.close).toBe(first.close);
  });
});

describe("a dirty form", () => {
  it("refuses a new session and counts the refusal", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startEdit(rowA));
    act(() => result.current.setDirty(true));

    let entered: boolean | undefined;
    act(() => {
      entered = result.current.startCreate();
    });
    expect(entered).toBe(false);
    expect(result.current.session).toEqual({ kind: "edit", row: rowA });
    expect(result.current.refusals).toBe(1);

    act(() => {
      entered = result.current.startCellEdit(rowB, "name", anchor);
    });
    expect(entered).toBe(false);
    expect(result.current.editingRow).toBe(rowA);
    expect(result.current.refusals).toBe(2);
  });

  it("gives way once it is clean again", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startCreate());
    act(() => result.current.setDirty(true));
    act(() => result.current.setDirty(false));

    let entered: boolean | undefined;
    act(() => {
      entered = result.current.startEdit(rowA);
    });
    expect(entered).toBe(true);
    expect(result.current.editingRow).toBe(rowA);
  });

  it("is forgotten by close, so the next session is not refused", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startEdit(rowA));
    act(() => result.current.setDirty(true));
    act(() => result.current.close());

    let entered: boolean | undefined;
    act(() => {
      entered = result.current.startCreate();
    });
    expect(entered).toBe(true);
    expect(result.current.session.kind).toBe("create");
  });

  it("does not guard a cell popover", () => {
    // Only the row form writes the flag; a stale one must not outlive the session kinds
    // it applies to.
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startCellEdit(rowA, "name", anchor));
    act(() => result.current.setDirty(true));
    act(() => result.current.startEdit(rowB));
    expect(result.current.editingRow).toBe(rowB);
  });
});

describe("the session serial", () => {
  it("counts entered sessions, not refusals or closes", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    expect(result.current.serial).toBe(0);
    act(() => result.current.startCreate());
    expect(result.current.serial).toBe(1);
    act(() => result.current.startEdit(rowA));
    expect(result.current.serial).toBe(2);

    act(() => result.current.setDirty(true));
    act(() => result.current.startCreate());
    expect(result.current.serial).toBe(2);

    act(() => result.current.close());
    expect(result.current.serial).toBe(2);
  });

  it("changes when a create session is re-entered with the same seed", () => {
    // A chained draft reuses the seed; the serial is what remounts its form clean.
    const { result } = renderHook(() => useEditSession<Row>());
    const seed = { name: "preset" };
    act(() => result.current.startCreate(seed));
    const before = result.current.serial;
    act(() => {
      result.current.close();
      result.current.startCreate(seed);
    });
    expect(result.current.createSeed).toBe(seed);
    expect(result.current.serial).toBe(before + 1);
  });
});

describe("the edit session's focus column", () => {
  it("is carried when given and absent otherwise", () => {
    const { result } = renderHook(() => useEditSession<Row>());
    act(() => result.current.startEdit(rowA, "name"));
    expect(result.current.focusColumnId).toBe("name");
    expect(result.current.editingRow).toBe(rowA);

    act(() => result.current.startEdit(rowB));
    expect(result.current.focusColumnId).toBeUndefined();
    expect(result.current.session).toEqual({ kind: "edit", row: rowB });
  });
});
