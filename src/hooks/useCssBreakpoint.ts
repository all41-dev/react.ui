import { useLayoutEffect, useRef, useState } from "react";

/**
 * Whether the element the ref is put on is displayed, tracked as it resizes.
 * Put on a sentinel that a CSS breakpoint shows or hides (`hidden @6xl:block`)
 * it reads that breakpoint from JS, so one stylesheet rule decides a layout
 * that has to differ in structure, not only in classes. Read before the first
 * paint, so the guess never shows.
 */
export function useCssBreakpoint(initial = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [matches, setMatches] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setMatches(getComputedStyle(el).display !== "none");
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, matches };
}
