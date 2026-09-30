/**
 * One shimmering placeholder bar, the same the grid stands its rows in for.
 * Size and position it with utility classes: `<Skeleton className="h-4 w-40" />`;
 * a bar with no size is one text line high. `hidden` keeps the bar's space while
 * showing nothing, for the loading delay a host observes before it shows a
 * placeholder at all. The shimmer stops under `prefers-reduced-motion`.
 */
export function Skeleton({
  className = "",
  hidden = false,
}: {
  className?: string;
  hidden?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`rui-skeleton ${hidden ? "invisible" : ""} ${className}`}
    />
  );
}
