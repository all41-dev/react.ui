import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useEditSession } from "./useEditSession";

type Row = { id: number; name: string };
const rowA: Row = { id: 1, name: "a" };
const rowB: Row = { id: 2, name: "b" };
const anchor = { top: 0, bottom: 20, left: 0, width: 100 };

/**
 * B2 and B3 were both consequences of `editing`, `open` and `cellEdit` being three
 * independent facts about one session. These tests pin the property that replaced them:
 * the session is a single value, so the states that used to drift cannot be constructed.
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

  it("B2: closing clears the form and the row together", () => {
    // The old pair let `editing` go null while `open` stayed true, and the drawer
    // re-rendered as a blank Create form. One atom makes that unrepresentable.
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
