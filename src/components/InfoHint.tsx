import { Info } from "lucide-react";

import { Tooltip } from "./Tooltip";

/*
 * A small info icon whose tooltip holds a sentence of explanation, so the visible
 * text beside it stays a noun or a state. Focusable, so the keyboard reaches it, and
 * named after its text for a reader.
 */
export function InfoHint({
  text,
  place = "top",
  className = "",
}: {
  text: string;
  place?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <Tooltip content={text} place={place}>
      <button
        type="button"
        aria-label={text}
        className={`inline-grid size-4 flex-none cursor-help place-items-center rounded-full border-0 bg-transparent p-0 align-middle text-faint hover:text-body focus-visible:text-body ${className}`}
      >
        <Info size={12} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
