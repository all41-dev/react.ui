import type { ReactNode } from "react";

/*
 * Where the viewer is, breadcrumb-shaped but without links: an ordered list of
 * segments separated by chevrons, the last one marked as the current location.
 * Nothing here navigates; a segment that needs to be interactive (a popover
 * trigger, a heading) is handed in as a `node`.
 */

export type TrailSegment = {
  key: string;
  /** Text of the segment; ignored when `node` is given. */
  label?: string;
  /** Replaces the text: a button opening a popover, an `<h2>`, an icon and a name. */
  node?: ReactNode;
  mono?: boolean;
  /** Tooltip; the full text once the label truncates. */
  title?: string;
  /** Collapses on a narrow container: hidden below the named breakpoint. */
  minWidth?: "md" | "lg";
  /** Width and shrink rules of the segment, e.g. `max-w-48` or `shrink-0 max-w-64`. */
  className?: string;
};

export type LocationTrailProps = {
  segments: TrailSegment[];
  /** `strip`: 11px faint text on a row of its own. `bar`: 12px muted text inline in a toolbar. */
  variant?: "strip" | "bar";
  className?: string;
};

const VARIANT_CLASS: Record<NonNullable<LocationTrailProps["variant"]>, string> = {
  strip: "text-[.6875rem] text-faint",
  bar: "text-xs text-muted",
};

const MIN_WIDTH_CLASS: Record<NonNullable<TrailSegment["minWidth"]>, string> = {
  md: "hidden md:flex",
  lg: "hidden lg:flex",
};

export function LocationTrail({ segments, variant = "strip", className = "" }: LocationTrailProps) {
  const last = segments.length - 1;

  return (
    <ol
      aria-label="Location"
      className={`flex min-w-0 items-center gap-1.5 ${VARIANT_CLASS[variant]} ${className}`}
    >
      {segments.map((segment, index) => (
        <li
          key={segment.key}
          aria-current={index === last ? "location" : undefined}
          className={`${segment.minWidth ? MIN_WIDTH_CLASS[segment.minWidth] : "flex"} min-w-0 items-center gap-1.5 ${segment.className ?? ""}`}
        >
          {index > 0 && (
            <span aria-hidden="true" className="flex-none select-none">
              ›
            </span>
          )}
          {segment.node ?? (
            <span
              title={segment.title}
              className={`truncate ${segment.mono ? "font-mono" : ""}`}
            >
              {segment.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
