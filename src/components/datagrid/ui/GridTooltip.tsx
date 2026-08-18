import { useEffect } from "react";
import { Tooltip } from "react-tooltip";

/* Module-level so the identity is stable — react-tooltip's memo keys on it, and a fresh
   object per render tears down and re-attaches the global listeners every time. */
const CLOSE_EVENTS = { escape: true } as const;

/**
 * The grid's single tooltip instance. Mounted outside the grid root: that element is
 * `overflow-hidden`, which clips tooltips on cells near an edge. Positioning is fixed
 * against the anchor, so it doesn't need to be a descendant.
 */
export function GridTooltip({ id }: { id: string }) {
  /* While the tooltip is visibly open, Escape means "dismiss the tooltip" (WCAG
     1.4.13), not "cancel the edit": the overlay containers cancel on any Escape that
     is not defaultPrevented, and react-tooltip closes without preventing. The capture
     phase runs ahead of the overlay's document listener; react-tooltip's own window
     listener ignores defaultPrevented, so the tooltip still closes — the next Escape
     then reaches the overlay. Open state is read off the DOM (the tooltip element
     carries `id` and the public `react-tooltip__show` class exactly while shown)
     because `afterShow` trails the visible open by a timer, leaving a window where an
     Escape would cancel the form under a visible tooltip. An anchor-level onKeyDown
     would miss the hover case, where focus sits in an input while the pointer rests
     on the icon. */
  useEffect(() => {
    const swallow = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tooltip = document.getElementById(id);
      if (tooltip?.classList.contains("react-tooltip__show")) e.preventDefault();
    };
    document.addEventListener("keydown", swallow, true);
    return () => document.removeEventListener("keydown", swallow, true);
  }, [id]);

  return <Tooltip id={id} positionStrategy="fixed" globalCloseEvents={CLOSE_EVENTS} />;
}
