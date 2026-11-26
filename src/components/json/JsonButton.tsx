import type { MouseEvent } from "react";
import { Braces } from "lucide-react";
import { chipClass } from "../DisclosureButton";
import { IconButton } from "../IconButton";
import { useJsonInspector } from "./jsonInspectorContext";
import type { JsonTarget } from "./jsonTarget";

/*
 * The one control that opens the JSON inspector. Self-contained: place it
 * beside whatever holds the raw record and hand it the target. The click
 * never reaches the parent, so it is safe inside a row that navigates.
 */

export type JsonButtonProps = {
  target: JsonTarget;
  /**
   * `label`: icon and the word "JSON", borderless. `chip`: the same in the bar's
   * bordered chip. `icon`: a 26px square, for a pill or beside a name.
   */
  variant?: "label" | "chip" | "icon";
  className?: string;
};

export function JsonButton({ target, variant = "label", className = "" }: JsonButtonProps) {
  const { open } = useJsonInspector();
  const label = `Show JSON: ${target.title}`;
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    open(target);
  };

  if (variant === "icon") {
    return (
      <IconButton label={label} size="sm" onClick={onClick} className={className}>
        <Braces size={13} aria-hidden="true" />
      </IconButton>
    );
  }

  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        className={`${chipClass} text-muted hover:text-body ${className}`}
      >
        <Braces size={12} aria-hidden="true" />
        JSON
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`flex cursor-pointer items-center gap-1.5 rounded-md text-xs text-faint transition-colors hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] ${className}`}
    >
      <Braces size={12} aria-hidden="true" />
      JSON
    </button>
  );
}
