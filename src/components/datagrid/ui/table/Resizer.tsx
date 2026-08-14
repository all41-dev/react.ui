import type { Header } from "@tanstack/react-table";
import { useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";

const KEYBOARD_RESIZE_STEP = 16;

type PointerLike = MouseEvent | TouchEvent | ReactMouseEvent | ReactTouchEvent;

const clientXOf = (e: PointerLike) =>
  "touches" in e ? e.touches[0]?.clientX : e.clientX;

/**
 * The drag handle on a column's trailing edge.
 *
 * `renderedWidth` is what the column actually paints at, which is not `getSize()` for the
 * stretched final column. TanStack's own handler seeds the drag from `getSize()`, so on
 * that column the first pixel of movement would snap it down to its model width; it gets
 * a plain pointer loop of its own instead, anchored to the width under the cursor.
 */
export function Resizer<TRow extends object>({
  h,
  renderedWidth,
  columnLabel,
}: {
  h: Header<TRow, unknown>;
  renderedWidth: number;
  columnLabel: string;
}) {
  const endDragRef = useRef<(() => void) | null>(null);
  /* A handle that unmounts mid-drag — a column reorder, a view switch — leaves its
     document listeners attached and every later pointer move keeps resizing. */
  useEffect(() => () => endDragRef.current?.(), []);

  const { column } = h;
  if (!column.getCanResize()) return null;

  /* The stretched column can paint wider than `maxSize`. The effective max absorbs the
     rendered width so a step anchored there stays a step instead of snapping to
     `maxSize`. */
  const minWidth = column.columnDef.minSize ?? 40;
  const maxWidth = Math.max(column.columnDef.maxSize ?? 1000, renderedWidth);
  const clamp = (next: number) =>
    Math.max(minWidth, Math.min(next, maxWidth));

  const setSize = (next: number) =>
    h.getContext().table.setColumnSizing((prev: Record<string, number>) => ({
      ...prev,
      [column.id]: clamp(next),
    }));

  const isStretched = Math.round(renderedWidth) !== Math.round(column.getSize());

  const dragFromRendered = (e: ReactMouseEvent | ReactTouchEvent) => {
    const startX = clientXOf(e);
    if (typeof startX !== "number") return;
    // Without this a mouse drag selects text across the whole page as it moves.
    if (!("touches" in e)) e.preventDefault();
    const startW = renderedWidth;

    const move = (ev: MouseEvent | TouchEvent) => {
      if (ev.cancelable && "touches" in ev) ev.preventDefault();
      const x = clientXOf(ev);
      if (typeof x === "number") setSize(startW + (x - startX));
    };
    const up = () => {
      endDragRef.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
      document.removeEventListener("touchcancel", up);
    };
    /* Held so an unmount mid-drag — a column reorder, a view switch — can detach the
       document listeners; otherwise they keep resizing a column that is gone. */
    endDragRef.current = up;
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", up);
    document.addEventListener("touchcancel", up);
  };

  const onStart = isStretched ? dragFromRendered : h.getResizeHandler();

  return (
    <>
      <div
        aria-hidden
        className="absolute top-0 bottom-0 right-0 w-px pointer-events-none bg-surface-inset z-10"
      />
      {/* Focusable so the column can be resized without a pointer: arrows step the width,
          Home resets it. */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={`Resize ${columnLabel} column`}
        /* A focusable separator is a window splitter, and its bounds are part of that
           contract — `aria-valuenow` alone leaves the range unannounced. */
        aria-valuenow={Math.round(renderedWidth)}
        aria-valuemin={Math.round(minWidth)}
        aria-valuemax={Math.round(maxWidth)}
        onMouseDown={onStart}
        onTouchStart={onStart}
        /* Scoped to the handle. On the `<th>` it also fired for a double-click on the
           sort button, which silently discarded the column's width. */
        onDoubleClick={() => column.resetSize()}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setSize(renderedWidth - KEYBOARD_RESIZE_STEP);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setSize(renderedWidth + KEYBOARD_RESIZE_STEP);
          } else if (e.key === "Home") {
            e.preventDefault();
            column.resetSize();
          }
        }}
        className="absolute top-0 bottom-0 right-0 w-2 cursor-col-resize select-none touch-none opacity-0 outline-none z-10 group-hover/hd:opacity-100 focus-visible:opacity-100 focus-visible:bg-accent"
        title="Drag to resize. Arrow keys to adjust, Home or double-click to reset."
      />
    </>
  );
}
