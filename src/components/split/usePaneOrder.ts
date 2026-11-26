import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";

/*
 * The order of a row of panes, changed by dragging a pane's grip onto another
 * pane or by the arrow keys on the grip, and remembered under one versioned
 * key as `{ v, order }`. A stored order naming any other set of ids reads as
 * the default. Enter on a grip resets the order and forgets the key. A grip
 * keeps the focus through its own move. The host renders `announcement` in a
 * live region mounted before the first move.
 */

const PREFS_VERSION = 1;

export type InsertEdge = "before" | "after";

/** The default order when nothing valid is stored. Best-effort: a blocked storage reads as the default. */
export function readPaneOrder<Id extends string>(storageKey: string | undefined, ids: readonly Id[]): Id[] {
  if (!storageKey) return [...ids];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [...ids];
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [...ids];
    const { v, order } = parsed as { v?: unknown; order?: unknown };
    if (v !== PREFS_VERSION || !Array.isArray(order) || order.length !== ids.length) return [...ids];
    const same = ids.every((id) => order.includes(id));
    return same ? (order as Id[]) : [...ids];
  } catch {
    return [...ids];
  }
}

/** `null` forgets the order. */
export function writePaneOrder<Id extends string>(storageKey: string | undefined, order: readonly Id[] | null) {
  if (!storageKey) return;
  try {
    if (order === null) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify({ v: PREFS_VERSION, order }));
  } catch {
    // Nothing to do: the order lasts the session.
  }
}

/** `id` taken out and put back before or after `target`. */
export function insertPane<Id extends string>(
  order: readonly Id[],
  id: Id,
  target: Id,
  edge: InsertEdge,
): Id[] {
  if (id === target) return [...order];
  const rest = order.filter((x) => x !== id);
  const at = rest.indexOf(target) + (edge === "after" ? 1 : 0);
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

const sameOrder = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

export interface PaneOrderOptions<Id extends string> {
  /** The default order. */
  ids: readonly Id[];
  /** localStorage key of the remembered order; none keeps it in memory. */
  storageKey?: string;
  /** The panes' names, for the grips and the announcements. */
  labels: Record<Id, string>;
  /** Called with the new and the previous order on every change, a reset included. */
  onOrderChange?: (next: Id[], prev: Id[]) => void;
}

export function usePaneOrder<Id extends string>({
  ids,
  storageKey,
  labels,
  onOrderChange,
}: PaneOrderOptions<Id>) {
  const [order, setOrder] = useState<Id[]>(() => readPaneOrder(storageKey, ids));
  const [dragging, setDragging] = useState<Id | null>(null);
  const [over, setOver] = useState<{ id: Id; edge: InsertEdge } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const uid = useId();
  const gripOf = (id: Id) => `${uid}${id}`;
  // The grip to focus again once its pane has moved in the document.
  const refocus = useRef<Id | null>(null);
  useEffect(() => {
    const id = refocus.current;
    if (id === null) return;
    refocus.current = null;
    for (const grip of document.querySelectorAll<HTMLElement>("[data-pane-grip]")) {
      if (grip.dataset.paneGrip === `${uid}${id}`) grip.focus();
    }
  }, [order, uid]);

  const apply = (next: Id[], said: string) => {
    if (!sameOrder(next, order)) {
      setOrder(next);
      writePaneOrder(storageKey, next);
      onOrderChange?.(next, order);
    }
    setAnnouncement(said);
  };

  const reset = () => {
    const next = [...ids];
    if (!sameOrder(next, order)) {
      setOrder(next);
      onOrderChange?.(next, order);
    }
    writePaneOrder(storageKey, null);
    setAnnouncement("Pane order reset");
  };

  const moveBy = (id: Id, step: number) => {
    const from = order.indexOf(id);
    const to = Math.min(order.length - 1, Math.max(0, from + step));
    if (to === from) return;
    const next = order.filter((x) => x !== id);
    next.splice(to, 0, id);
    const where =
      to === 0 ? "the left edge" : to === next.length - 1 ? "the right edge" : to < from ? "the left" : "the right";
    refocus.current = id;
    apply(next, `${labels[id]} moved to ${where}`);
  };

  /** What a drop on `target` at `edge` would give; null where it changes nothing. */
  const dropResult = (target: Id, edge: InsertEdge) => {
    if (dragging === null) return null;
    const next = insertPane(order, dragging, target, edge);
    return sameOrder(next, order) ? null : next;
  };

  /** The drag handle of a pane: a button, draggable, moved by the keys. */
  const gripProps = (id: Id) => ({
    draggable: true,
    "data-pane-grip": gripOf(id),
    "aria-label": `Move the ${labels[id]} pane`,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      const pane = e.currentTarget.closest<HTMLElement>("[data-pane]");
      if (pane) {
        const rect = pane.getBoundingClientRect();
        e.dataTransfer.setDragImage(pane, e.clientX - rect.left, e.clientY - rect.top);
      }
      setDragging(id);
    },
    onDragEnd: () => {
      setDragging(null);
      setOver(null);
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "ArrowLeft") moveBy(id, -1);
      else if (e.key === "ArrowRight") moveBy(id, 1);
      else if (e.key === "Home") moveBy(id, -order.length);
      else if (e.key === "End") moveBy(id, order.length);
      else if (e.key === "Enter") reset();
      else return;
      e.preventDefault();
    },
  });

  /** A pane as a drop target: the edge under the pointer is the insertion point. */
  const paneProps = (id: Id) => ({
    "data-pane": id,
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (dragging === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = e.currentTarget.getBoundingClientRect();
      const edge: InsertEdge = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
      const next = dropResult(id, edge) === null ? null : { id, edge };
      setOver((prev) => (prev?.id === next?.id && prev?.edge === next?.edge ? prev : next));
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      // Leaving for a child element is not leaving the pane.
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setOver((prev) => (prev?.id === id ? null : prev));
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (dragging === null) return;
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const edge: InsertEdge = e.clientX < rect.left + rect.width / 2 ? "before" : "after";
      const next = dropResult(id, edge);
      if (next) apply(next, `${labels[dragging]} moved to the ${edge === "before" ? "left" : "right"} of ${labels[id]}`);
      setDragging(null);
      setOver(null);
    },
  });

  /** The insertion line to draw on a pane while a drag hovers it. */
  const edgeOf = (id: Id): InsertEdge | null => (over?.id === id ? over.edge : null);

  return { order, labels, dragging, announcement, gripProps, paneProps, edgeOf, reset };
}

/** What `usePaneOrder` returns, as `SplitRow` takes it. */
export type PaneOrder<Id extends string> = ReturnType<typeof usePaneOrder<Id>>;
