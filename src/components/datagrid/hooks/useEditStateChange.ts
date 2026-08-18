import { useEffect, useRef } from "react";

import type { EditState } from "../types/grid";
import type { EditSession } from "./useEditSession";

const IDLE = { kind: "idle" } as const;

/** The session without its DOM geometry — the anchor is the popover's, not the parent's. */
function publicState<TRow>(session: EditSession<TRow>): EditState<TRow> {
  return session.kind === "cell"
    ? { kind: "cell", row: session.row, columnId: session.columnId }
    : session;
}

const same = <TRow,>(a: EditState<TRow>, b: EditState<TRow>) =>
  a.kind === b.kind &&
  (a as { row?: TRow }).row === (b as { row?: TRow }).row &&
  (a as { columnId?: string }).columnId === (b as { columnId?: string }).columnId;

/**
 * Reports every change of edit session to the consumer.
 *
 * Compares against the last state it reported rather than firing on each commit: the
 * grid re-runs the effect whenever the session object is replaced, and a parent that
 * closes its own panel from this callback must not be told the same thing twice.
 */
export function useEditStateChange<TRow>(
  session: EditSession<TRow>,
  onEditStateChange?: (state: EditState<TRow>) => void
) {
  /* Held in a ref so an inline arrow prop — the usual way this is passed — doesn't make
     every render look like a new subscription. */
  const handler = useRef(onEditStateChange);
  useEffect(() => {
    handler.current = onEditStateChange;
  });

  const reported = useRef<EditState<TRow>>(IDLE);
  useEffect(() => {
    const next = publicState(session);
    if (same(reported.current, next)) return;
    reported.current = next;
    handler.current?.(next);
  }, [session]);
}
