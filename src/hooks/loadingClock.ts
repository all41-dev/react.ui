import { createContext } from "react";

/**
 * When a wait shared by several indicators began. A host that knows one, a
 * router timing a navigation, provides it: an indicator that mounts already
 * loading while the clock is not settled counts its delay from `since`
 * rather than from its own mount, so a code chunk followed by a data read is
 * one wait. Once `settled()` answers true, the content that wait was for has
 * rendered, and an indicator mounted afterwards times a wait of its own.
 */
export type LoadingClock = {
  since: number;
  settled: () => boolean;
};

export const LoadingClockContext = createContext<LoadingClock | null>(null);
