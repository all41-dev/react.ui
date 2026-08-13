import { useMemo } from "react";

export type Anchor = { top: number; bottom: number; left: number; width: number };

export type AnchoredPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

const MIN_WIDTH = 320;
const MAX_WIDTH = 480;
const GAP = 4;
const EDGE = 8;

/**
 * Places a floating panel under its anchor, or above it when the estimated height would
 * run off the bottom of the viewport. Horizontally clamped to stay on screen.
 *
 * `estimatedHeight` is a guess made before the panel renders — the flip only has to be
 * right often enough to avoid a visible jump, not exact.
 *
 * Memoised on the anchor so the panel holds still while its content re-renders: the
 * viewport is read at placement time and a later read would move it under the cursor.
 */
export function useAnchoredPosition(
  anchor: Anchor,
  estimatedHeight: number
): AnchoredPosition {
  return useMemo(() => {
    const width = Math.max(MIN_WIDTH, Math.min(anchor.width, MAX_WIDTH));
    const left = Math.min(Math.max(EDGE, anchor.left), window.innerWidth - width - EDGE);
    const openUp = anchor.bottom + estimatedHeight > window.innerHeight;
    return openUp
      ? { left, width, bottom: window.innerHeight - anchor.top + GAP }
      : { left, width, top: anchor.bottom + GAP };
  }, [anchor, estimatedHeight]);
}
