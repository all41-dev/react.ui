import { TriangleAlert } from "lucide-react";

/**
 * Centred icon over a title and a message, for a load that failed rather than a
 * list that is empty. `onRetry` adds the recovery button. The sibling of
 * `EmptyState`: same footprint, so a host can swap one for the other in place.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  className = "",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-1.5 px-4 py-11 text-center ${className}`}
    >
      <TriangleAlert className="h-6 w-6 text-danger" aria-hidden="true" />
      <p className="text-[.8125rem] font-semibold text-body">{title}</p>
      {message && <p className="text-[.6875rem] text-muted">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1.5 cursor-pointer rounded-control border border-border-default bg-surface-card px-2.5 py-1 text-[.75rem] text-body transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
