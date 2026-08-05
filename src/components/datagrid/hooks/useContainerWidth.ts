import { useLayoutEffect, useRef, useState } from "react";

export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setWidth(el.clientWidth);
    update();

    // The frame is tracked so cleanup can cancel it. Without this, a resize landing just
    // before unmount ran update() on a dead component; coalescing also drops redundant
    // measurements during a continuous drag.
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

  return { ref, width };
}
