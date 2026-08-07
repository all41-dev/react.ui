import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

/** Space between the trigger and the panel, matching the old `top-[calc(100%+6px)]`. */
const GAP = 6;
/** Keeps a viewport-clamped panel off the window edge. */
const MARGIN = 8;

/**
 * Viewport coordinates for a right-aligned panel hanging off a trigger.
 *
 * Toolbar panels cannot be `absolute`. The grid root is `overflow-hidden` — it has to be,
 * or the sticky header and footer paint over its rounded corners — so an absolutely
 * positioned panel is clipped as soon as it is taller than the room left below it. On an
 * empty grid the Columns popover was cut off after its first row, 193px of it gone.
 *
 * `fixed` escapes the clip, and unlike a portal it leaves the panel a DOM child of its
 * trigger, so the outside-click dismissal in both popovers keeps working by containment —
 * including the nested case, where the Columns panel lives inside the overflow menu.
 * (The toolbar also has to outrank the sticky footer's `z-10`, or the footer paints over
 * the escaped panel; see `DataGridToolbar`.)
 *
 * @param open      Whether the panel is mounted — the position is only tracked while it is.
 * @param anchorRef The trigger's wrapper. The panel's right edge lines up with its right edge.
 * @param width     The panel's width in px, needed to place its left edge.
 * @param estHeight Roughly how tall the panel is, used to decide whether to flip it up.
 */
export function useAnchoredPanel(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  width: number,
  estHeight: number
): CSSProperties {
  /* Hidden until measured: the layout effect places it before the first paint, but a
     bare `position: static` in the meantime would drop the panel into the toolbar's flow. */
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.min(
        Math.max(MARGIN, r.right - width),
        Math.max(MARGIN, window.innerWidth - width - MARGIN)
      );
      // Flip up only when below genuinely has less room than above — near the bottom of
      // a short window neither side fits and dropping down is the lesser evil.
      const below = window.innerHeight - r.bottom;
      const above = r.top;
      const openUp = below < estHeight && above > below;
      // Whichever side it lands on, cap it to the room actually there: `fixed` is
      // measured against the viewport, so anything past its edge is unreachable — there
      // is no scrollable ancestor to bring it back. The panels scroll internally, so a
      // maxHeight turns "cut off" into "scrolls".
      const maxHeight = Math.max(0, (openUp ? above : below) - GAP - MARGIN);
      const next: CSSProperties = openUp
        ? { position: "fixed", left, bottom: window.innerHeight - r.top + GAP, maxHeight }
        : { position: "fixed", left, top: r.bottom + GAP, maxHeight };
      // `place` runs per capture-phase scroll event; keeping the previous object when
      // nothing moved spares the open panel a re-render per event.
      setStyle((prev) =>
        prev.left === next.left &&
        prev.top === next.top &&
        prev.bottom === next.bottom &&
        prev.maxHeight === next.maxHeight
          ? prev
          : next
      );
    };

    place();
    // Capture, so the grid's own scroll containers reposition it too, not just the page.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchorRef, width, estHeight]);

  return style;
}
