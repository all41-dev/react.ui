import { useCallback, useEffect, useRef, useState } from "react";

export type CellAnchor = {
  top: number;
  bottom: number;
  left: number;
  width: number;
};

/**
 * The grid has exactly one edit session at a time. Modelling it as a union rather than
 * as separate `editing` / `open` / `cellEdit` atoms is what makes two whole classes of
 * bug unrepresentable:
 *
 * - the drawer that stayed open after `editing` was cleared and silently became a blank
 *   Create form, because `open` was a second, independent fact about the same session;
 * - the overlay Cancel that closed the UI without telling the parent, because each
 *   dismissal path tore the state down its own way. There is now one `close()`.
 */
export type EditSession<TRow> =
  | { kind: "idle" }
  | { kind: "create" }
  | { kind: "edit"; row: TRow }
  | { kind: "cell"; row: TRow; columnId: string; anchor: CellAnchor };

const IDLE = { kind: "idle" } as const;

type Params<TRow> = {
  getId: (row: TRow) => string | number | undefined;
  onEditStart?: (rowId: string | number) => void;
  onCancelEdit?: () => void;
  /** Imperative signal: the parent bumps this number to cancel whatever is open. */
  cancelEditTrigger?: number;
};

export function useEditSession<TRow>({
  getId,
  onEditStart,
  onCancelEdit,
  cancelEditTrigger,
}: Params<TRow>) {
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
    (row: TRow) => {
      enter({ kind: "edit", row });
      const rowId = getId(row);
      if (rowId !== undefined) onEditStart?.(rowId);
    },
    [enter, getId, onEditStart]
  );

  const startCellEdit = useCallback(
    (row: TRow, columnId: string, anchor: CellAnchor) =>
      enter({ kind: "cell", row, columnId, anchor }),
    [enter]
  );

  /** The single teardown. Every dismissal and every successful save routes through it. */
  const close = useCallback(() => {
    const prev = sessionRef.current;
    if (prev.kind === "idle") return;
    sessionRef.current = IDLE;
    setSession(IDLE);
    /*
     * `onCancelEdit` is the counterpart to `onEditStart`, which only ever fires for a
     * row edit — so dismissing a cell popover is not the end of a session the parent
     * was ever told about, and announcing it would be noise.
     */
    if (prev.kind === "create" || prev.kind === "edit") onCancelEdit?.();
  }, [onCancelEdit]);

  /*
   * The ref is seeded with the incoming value so mounting never counts as a change, and
   * it advances on EVERY change rather than only while something is being edited —
   * otherwise a bump that arrives with no editor open leaves the ref stale, and the next
   * editor the user opens is cancelled the moment it appears.
   */
  const prevCancelTriggerRef = useRef<number | undefined>(cancelEditTrigger);
  useEffect(() => {
    if (prevCancelTriggerRef.current === cancelEditTrigger) return;
    prevCancelTriggerRef.current = cancelEditTrigger;
    if (cancelEditTrigger === undefined || cancelEditTrigger <= 0) return;
    close();
  }, [cancelEditTrigger, close]);

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
