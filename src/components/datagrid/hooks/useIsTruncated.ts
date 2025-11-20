import { useCallback, useState } from "react";

export function useIsTruncated() {
  const [truncated, setTruncated] = useState(false);

  const onMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    // Check if the element is truncated
    if (el.scrollWidth > el.clientWidth) {
      setTruncated(true);
    }
  }, []);

  return { truncated, onMouseEnter };
}
