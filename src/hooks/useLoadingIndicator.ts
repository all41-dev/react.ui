import { useEffect, useRef, useState } from "react";

export type LoadingIndicatorOptions = {
  /** How long a wait must last before its indicator appears. */
  delayMs?: number;
  /** How long the indicator stays once shown, even if the wait ends sooner. */
  minVisibleMs?: number;
};

/**
 * Whether to show a loading state for `loading`. Nothing is shown for a wait
 * shorter than `delayMs`, so a fast response never flashes a placeholder; a
 * shown indicator stays for `minVisibleMs`, so a response landing just after
 * the delay does not flash it either. The grid drives its skeleton and scrim
 * through this; a host can drive its own placeholders the same way.
 */
export function useLoadingIndicator(
  loading: boolean,
  { delayMs = 250, minVisibleMs = 400 }: LoadingIndicatorOptions = {}
): boolean {
  const [shown, setShown] = useState(false);
  const waitStart = useRef<number | null>(null);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      waitStart.current ??= Date.now();
      if (shown) return;
      const timer = setTimeout(
        () => {
          shownAt.current = Date.now();
          setShown(true);
        },
        Math.max(0, delayMs - (Date.now() - waitStart.current))
      );
      return () => clearTimeout(timer);
    }

    waitStart.current = null;
    if (!shown) return;
    const visible = Date.now() - (shownAt.current ?? Date.now());
    const timer = setTimeout(
      () => setShown(false),
      Math.max(0, minVisibleMs - visible)
    );
    return () => clearTimeout(timer);
  }, [loading, shown, delayMs, minVisibleMs]);

  return shown;
}
