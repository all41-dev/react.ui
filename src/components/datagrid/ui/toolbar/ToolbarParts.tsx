import { LayoutGrid, List, X } from "lucide-react";

import type { GridView } from "../../types/toolbar";

/** Title, row-count pill and subtitle — the left half of the toolbar row. */
export function ToolbarTitle({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle?: string;
  count?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <h2 className="whitespace-nowrap text-[.9375rem] font-semibold text-body">
        {title}
      </h2>
      {typeof count === "number" && (
        <span className="rounded-full bg-surface-inset px-[7px] py-px font-mono text-[.6875rem] font-semibold leading-normal text-muted">
          {count}
        </span>
      )}
      {subtitle && (
        <span className="min-w-0 truncate text-[.75rem] text-faint">{subtitle}</span>
      )}
    </div>
  );
}

const VIEWS = [
  { id: "list" as const, Icon: List, label: "List view" },
  { id: "cards" as const, Icon: LayoutGrid, label: "Cards view" },
];

/**
 * List/cards switch. An inset trough with the active tab lifted onto the card surface, so
 * it reads as one control with a current state rather than two buttons.
 */
export function ViewSwitch({
  view,
  onViewChange,
}: {
  view: GridView;
  onViewChange: (v: GridView) => void;
}) {
  return (
    <div
      role="group"
      aria-label="View"
      className="inline-flex gap-0.5 rounded-control border border-border-default bg-surface-inset p-0.5"
    >
      {VIEWS.map(({ id, Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onViewChange(id)}
          aria-label={label}
          aria-pressed={view === id}
          title={label}
          className={`grid h-6 w-7 cursor-pointer place-items-center rounded-[5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] ${
            view === id
              ? "bg-surface-card text-accent shadow-[0_1px_2px_rgba(0,0,0,.18)]"
              : "text-faint hover:text-body"
          }`}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}

/**
 * A full-bleed band directly under the toolbar — part of the grid's chrome, not a floating
 * card inset from the edges.
 */
export function ToolbarErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry?: () => void | Promise<void>;
  onDismiss: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 border-b border-[color-mix(in_srgb,var(--rui-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--rui-danger)_12%,transparent)] px-3.5 py-[11px] text-[.8125rem] text-danger"
      role="alert"
    >
      <span className="min-w-0 flex-1 truncate">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 cursor-pointer rounded-control border border-[color-mix(in_srgb,var(--rui-danger)_40%,transparent)] px-2 py-0.5 text-[.75rem] font-semibold text-danger transition-colors hover:bg-[color-mix(in_srgb,var(--rui-danger)_18%,transparent)]"
        >
          Retry
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded text-danger transition-colors hover:bg-[color-mix(in_srgb,var(--rui-danger)_18%,transparent)]"
        aria-label="Dismiss error"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
