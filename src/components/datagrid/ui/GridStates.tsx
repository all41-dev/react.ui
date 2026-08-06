import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/>
        <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" fill="none"/>
      </svg>
      {label && <span>{label}</span>}
    </div>
  );
}

/*
 * One shimmer bar per column in a full-height row, so the skeleton occupies the same
 * layout the data will.
 *
 * Widths cycle through a fixed list rather than being random — a fresh random width each
 * render makes the skeleton twitch.
 */
const SKELETON_WIDTHS = ["70%", "45%", "85%", "35%", "60%"];

export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr aria-hidden>
      {Array.from({ length: Math.max(1, cols) }, (_, i) => (
        <td key={i} className="h-10 px-3 align-middle">
          <div
            className="rui-skeleton"
            style={{ width: SKELETON_WIDTHS[i % SKELETON_WIDTHS.length] }}
          />
        </td>
      ))}
    </tr>
  );
}

/** Centred icon over the label, in the faint tone. */
export function EmptyState({
  title = "No data",
  description,
  action,
}: {
  title?: string;
  description?: string;
  /** Recovery affordance — the "Clear filters" button on a no-results state. */
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-11 text-center text-faint">
      <Inbox className="h-6 w-6" aria-hidden="true" />
      <p className="text-[.8125rem]">{title}</p>
      {description && <p className="text-[.6875rem]">{description}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

/**
 * Shown instead of the plain empty state when filters are what emptied the grid —
 * "no data" and "no matches" are different problems and only one of them is the
 * user's to fix.
 */
export function NoResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <EmptyState
      title="No matching results"
      description="No rows match the current search and filters."
      action={
        <button
          type="button"
          onClick={onClearFilters}
          className="cursor-pointer rounded-control border border-border-default bg-surface-card px-2.5 py-1 text-[.75rem] text-body transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
        >
          Clear filters
        </button>
      }
    />
  );
}
