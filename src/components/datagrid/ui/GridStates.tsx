import { Inbox } from "lucide-react";

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
 * `.og-sk` — one 9px shimmer bar per column, in a real 40px row, so the skeleton
 * occupies the layout the data will. The previous version was a single colSpan cell
 * holding a 12-column grid of `animate-pulse` blocks: the wrong height, the wrong
 * column positions, and an opacity pulse where the design calls for a gradient sweep.
 *
 * Widths repeat on a fixed cycle rather than randomly — a random width per render makes
 * the skeleton twitch on every re-render.
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

/** `.og-empty` — centred icon over the label, in the faint tone. */
export function EmptyState({
  title = "No data",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-11 text-center text-faint">
      <Inbox className="h-6 w-6" aria-hidden="true" />
      <p className="text-[.8125rem]">{title}</p>
      {description && <p className="text-[.6875rem]">{description}</p>}
    </div>
  );
}
