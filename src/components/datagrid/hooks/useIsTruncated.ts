import { useCallback } from "react";

export function useIsTruncated() {
  const onMouseEnter = useCallback(() => {}, []);
  return { truncated: false, onMouseEnter };
}
