import { useContext, useEffect, useRef, useState } from "react";
import { LoadingClockContext } from "./loadingClock";

export type LoadingIndicatorOptions = {
  /** How long a wait must last before its indicator appears. */
  delayMs?: number;
  /** How long the indicator stays once shown, even if the wait ends sooner. */
  minVisibleMs?: number;
};

/**
 * Whether to show a loading state for `loading`. Nothing is shown for a wait
 * shorter than `delayMs`; a shown indicator stays for `minVisibleMs`, so a
 * response landing just after the delay does not flash it. Under a
 * `LoadingClockContext`, a wait that starts with the component while the clock
 * is not settled counts from the clock rather than from the mount. The grid
 * drives its skeleton and scrim through this; a host can drive its own
 * placeholders the same way.
 */
export function useLoadingIndicator(
  loading: boolean,
  { delayMs = 250, minVisibleMs = 400 }: LoadingIndicatorOptions = {}
): boolean {
  const clock = useContext(LoadingClockContext);
  const [shown, setShown] = useState(false);
  // Only the wait a component mounts with can belong to the shared clock.
  const [mountedLoading] = useState(loading);
  const firstWait = useRef(true);
  const waitStart = useRef<number | null>(null);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      if (waitStart.current === null) {
        const fromClock =
          firstWait.current && mountedLoading && clock && !clock.settled();
        waitStart.current = fromClock ? clock.since : Date.now();
        firstWait.current = false;
      }
      if (shown) return;
      const start = waitStart.current;
      const timer = setTimeout(
        () => {
          shownAt.current = Date.now();
          setShown(true);
        },
        Math.max(0, delayMs - (Date.now() - start))
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
  }, [loading, shown, delayMs, minVisibleMs, clock, mountedLoading]);

  return shown;
}
