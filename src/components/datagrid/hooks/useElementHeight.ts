import { useLayoutEffect, useRef, useState } from "react";

/**
 * Live offsetHeight of an element. Mirrors `useContainerWidth`, including the tracked
 * frame so a resize landing just before unmount doesn't measure a dead component.
 *
 * Used for the sticky `<thead>`: the virtualizer needs its height as `scrollMargin`, and
 * that height changes whenever the filter row is toggled.
 */
export function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setHeight(el.offsetHeight);
    update();

    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  return { ref, height };
}
