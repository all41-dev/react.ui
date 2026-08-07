import { useCallback, useRef, useState } from "react";

export type CellAnchor = {
  top: number;
  bottom: number;
  left: number;
  width: number;
};

/**
 * The grid has exactly one edit session at a time, so it's one union rather than separate
 * `editing` / `open` / `cellEdit` flags. Two independent facts about the same session can
 * disagree — an open drawer with no row becomes a blank Create form — and a union makes
 * that unrepresentable. Every dismissal goes through the single `close()`.
 */
export type EditSession<TRow> =
  | { kind: "idle" }
  | { kind: "create" }
  | { kind: "edit"; row: TRow }
  | { kind: "cell"; row: TRow; columnId: string; anchor: CellAnchor };

const IDLE = { kind: "idle" } as const;

export function useEditSession<TRow>() {
  const [session, setSession] = useState<EditSession<TRow>>(IDLE);

  /*
   * The session is mirrored into a ref, written BEFORE setState, so two dismissals in the
   * same tick (Escape landing alongside a scrim click) can't both decide the session was
   * live and fire `onCancelEdit` twice. Only ever touched from these callbacks — never
   * during render — so it stays a legitimate use of a ref.
   */
  const sessionRef = useRef<EditSession<TRow>>(session);

  const enter = useCallback((next: EditSession<TRow>) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const startCreate = useCallback(() => enter({ kind: "create" }), [enter]);

  const startEdit = useCallback(
    (row: TRow) => enter({ kind: "edit", row }),
    [enter]
  );

  const startCellEdit = useCallback(
    (row: TRow, columnId: string, anchor: CellAnchor) =>
      enter({ kind: "cell", row, columnId, anchor }),
    [enter]
  );

  /** The single teardown. Every dismissal and every successful save routes through it. */
  const close = useCallback(() => {
    if (sessionRef.current.kind === "idle") return;
    sessionRef.current = IDLE;
    setSession(IDLE);
  }, []);

  /*
   * This object is a new literal every render — every member on it is stable, but the
   * wrapper is not, and memoising it would only hide that. Callers must depend on the
   * members they use (`close`, `startCellEdit`, `cell`, …), never on the object: a
   * `useCallback([edit])` anywhere in the grid rebuilds `DataGridContext`'s value on
   * every render and re-renders every cell in the body.
   */
  return {
    session,
    startCreate,
    startEdit,
    startCellEdit,
    close,
    /** The row being edited in a form, if any — not the one behind a cell popover. */
    editingRow: session.kind === "edit" ? session.row : undefined,
    cell: session.kind === "cell" ? session : undefined,
    /** Drives the overlay containers: a form session is open. */
    isFormOpen: session.kind === "create" || session.kind === "edit",
    formMode: session.kind === "edit" ? ("edit" as const) : ("create" as const),
  };
}
