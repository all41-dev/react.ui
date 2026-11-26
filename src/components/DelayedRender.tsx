import type { PropsWithChildren } from "react";
import { useLoadingIndicator } from "../hooks/useLoadingIndicator";

/**
 * Renders `children` only once `delayMs` has elapsed, so a response that
 * arrives quickly shows nothing at all rather than flashing a loader for a few
 * frames. For a Suspense fallback, which has no boolean to hand to
 * `useLoadingIndicator`; a component that knows its own loading flag uses the
 * hook directly and gets the minimum display time as well.
 */
export function DelayedRender({
  delayMs = 250,
  children,
}: PropsWithChildren<{ delayMs?: number }>) {
  const show = useLoadingIndicator(true, { delayMs, minVisibleMs: 0 });
  return show ? <>{children}</> : null;
}
