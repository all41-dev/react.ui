import type { ReactNode, Ref } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/*
 * A bordered toggle that unfolds a region elsewhere on the page: chevron, label, and
 * a dot while the region holds unsaved work. The label stays the same in both states;
 * the chevron and `aria-expanded` say which one it is in.
 */

/** The quiet bordered chip, for an action that sits beside the toggle and must match it. */
export const chipClass =
  "flex h-6 flex-none cursor-pointer items-center gap-1 rounded-md border border-border-default px-2 text-[.6875rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]";

export type DisclosureButtonProps = {
  open: boolean;
  onToggle: () => void;
  /** Id of the region the button unfolds; set on `aria-controls` while open. */
  controls?: string;
  /** Marks the region as holding unsaved work. */
  dirty?: boolean;
  children: ReactNode;
  className?: string;
  /** For handing focus back when the region folds away. */
  ref?: Ref<HTMLButtonElement>;
};

export function DisclosureButton({
  open,
  onToggle,
  controls,
  dirty = false,
  children,
  className = "",
  ref,
}: DisclosureButtonProps) {
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-controls={open ? controls : undefined}
      onClick={onToggle}
      title={dirty ? "Unsaved changes" : undefined}
      className={`${chipClass} ${
        open ? "bg-surface-raised text-body" : "text-muted hover:text-body"
      } ${className}`}
    >
      <Chevron size={12} aria-hidden="true" />
      {children}
      {dirty && (
        <>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
          <span className="sr-only">, unsaved changes</span>
        </>
      )}
    </button>
  );
}
