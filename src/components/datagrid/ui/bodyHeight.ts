/** The scroll box of every view: capped at 70% of the viewport, or the container's height under `fill`. */
export function bodyHeightClass(fill: boolean | undefined): string {
  return fill ? "min-h-0 flex-1" : "max-h-[70vh]";
}
