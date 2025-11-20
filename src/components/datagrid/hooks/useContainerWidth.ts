import { useLayoutEffect, useRef, useState } from "react";

export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setWidth(el.clientWidth);
    update();

    const ro = new ResizeObserver(() => requestAnimationFrame(update));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
