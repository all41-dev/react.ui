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
  | { kind: "create"; seed?: object }
  | {
      kind: "edit";
      row: TRow;
      /** Row mode: the column whose editor takes focus when the session opens. */
      focusColumnId?: string;
    }
  | { kind: "cell"; row: TRow; columnId: string; anchor: CellAnchor };

const IDLE = { kind: "idle" } as const;

const isPlainObject = (v: unknown): v is object => {
  if (v === null || typeof v !== "object") return false;
  const proto: unknown = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

type SessionState<TRow> = {
  session: EditSession<TRow>;
  /** Counts the sessions entered. A form keyed on it remounts clean per session. */
  serial: number;
};

export function useEditSession<TRow>() {
  const [state, setState] = useState<SessionState<TRow>>({ session: IDLE, serial: 0 });
  const { session, serial } = state;

  /*
   * The session is mirrored into a ref, written BEFORE setState, so two dismissals in the
   * same tick (Escape landing alongside a scrim click) can't both decide the session was
   * live and fire `onCancelEdit` twice. Only ever touched from these callbacks — never
   * during render — so it stays a legitimate use of a ref.
   */
  const sessionRef = useRef<EditSession<TRow>>(session);

  /*
   * Whether the open form holds unsaved changes. Written by the row form only, so the
   * refusal in `enter` never applies to the overlay containers. A ref rather than state:
   * nothing renders from it, and a keystroke must not re-render the grid.
   */
  const dirtyRef = useRef(false);

  /* Bumped on every refused session, so the open row can take focus back. */
  const [refusals, setRefusals] = useState(0);

  /** Returns `false` when the open form is dirty; the session is then left as it is. */
  const enter = useCallback((next: EditSession<TRow>) => {
    const current = sessionRef.current;
    if (
      dirtyRef.current &&
      (current.kind === "create" || current.kind === "edit")
    ) {
      setRefusals((n) => n + 1);
      return false;
    }
    dirtyRef.current = false;
    sessionRef.current = next;
    setState((s) => ({ session: next, serial: s.serial + 1 }));
    return true;
  }, []);

  /* Only a plain object counts as a seed: handed straight to `onClick`, this is called
     with the click event, whose fields must not reach the form. */
  const startCreate = useCallback(
    (seed?: object) =>
      enter(isPlainObject(seed) ? { kind: "create", seed } : { kind: "create" }),
    [enter]
  );

  const startEdit = useCallback(
    (row: TRow, focusColumnId?: string) =>
      enter(
        focusColumnId === undefined
          ? { kind: "edit", row }
          : { kind: "edit", row, focusColumnId }
      ),
    [enter]
  );

  const startCellEdit = useCallback(
    (row: TRow, columnId: string, anchor: CellAnchor) =>
      enter({ kind: "cell", row, columnId, anchor }),
    [enter]
  );

  /** The single teardown. Every dismissal and every successful save routes through it. */
  const close = useCallback(() => {
    dirtyRef.current = false;
    if (sessionRef.current.kind === "idle") return;
    sessionRef.current = IDLE;
    setState((s) => ({ session: IDLE, serial: s.serial }));
  }, []);

  /**
   * Lets go of an open create or edit before something else takes the user's attention:
   * an untouched one closes, a dirty one stays and is refused like `enter`, so the open
   * row takes focus back. `true` when nothing is left open.
   */
  const release = useCallback(() => {
    const current = sessionRef.current;
    if (current.kind !== "create" && current.kind !== "edit") return true;
    if (dirtyRef.current) {
      setRefusals((n) => n + 1);
      return false;
    }
    close();
    return true;
  }, [close]);

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
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
    serial,
    refusals,
    startCreate,
    startEdit,
    startCellEdit,
    close,
    release,
    /** Marks the open form as holding unsaved changes; a dirty form refuses a new session. */
    setDirty,
    /** The row being edited in a form, if any — not the one behind a cell popover. */
    editingRow: session.kind === "edit" ? session.row : undefined,
    /** Row mode: the column the edit session opened from. */
    focusColumnId: session.kind === "edit" ? session.focusColumnId : undefined,
    /** Values a create form starts from, over the column defaults. */
    createSeed: session.kind === "create" ? session.seed : undefined,
    cell: session.kind === "cell" ? session : undefined,
    /** Drives the overlay containers: a form session is open. */
    isFormOpen: session.kind === "create" || session.kind === "edit",
    formMode: session.kind === "edit" ? ("edit" as const) : ("create" as const),
  };
}
