import { useCallback, useRef, useState } from "react";

/**
 * Reports whether an element's text is actually clipped, so a tooltip can be attached
 * only where it reveals something.
 *
 * `measure` is called from an event handler rather than a ResizeObserver per cell: on a
 * grid of thousands of cells nothing is measured until a pointer or the keyboard actually
 * reaches one. Bind it to focus as well as hover — a clipped label on a focusable cell is
 * unreadable otherwise.
 */
export function useIsTruncated<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [truncated, setTruncated] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // +1 absorbs sub-pixel rounding, which otherwise reports clipping on exact fits.
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  return { ref, truncated, measure };
}
