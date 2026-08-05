import { useCallback, useRef, useState } from "react";

/**
 * Reports whether an element's text is actually clipped, measured on pointer-enter.
 *
 * This was previously a stub that always returned `false` with a no-op handler, which
 * meant the "tooltip only when the content overflows" feature never worked — callers
 * attached a tooltip to every cell regardless.
 *
 * Measuring lazily (rather than with a ResizeObserver per cell) keeps this cheap on
 * grids with thousands of cells: nothing is measured until the pointer arrives.
 */
export function useIsTruncated<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [truncated, setTruncated] = useState(false);

  const onMouseEnter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // +1 absorbs sub-pixel rounding, which otherwise reports clipping on exact fits.
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  return { ref, truncated, onMouseEnter };
}
