import type { EditorKind } from "../../types/column";

/**
 * The class string for a plain editor control.
 *
 * A 32px field on the inset surface, so it reads as an input against the panel behind
 * it rather than relying on its edge alone. No hover style — hover isn't a state a
 * text field has. A textarea opts out of the fixed control height. Rich editors carry
 * their own chrome, so they only get the consumer's own class.
 */
export function buildEditorClassName({
  editor,
  isRich,
  hasError,
  editorClassName,
}: {
  editor: EditorKind | undefined;
  isRich: boolean;
  hasError: boolean;
  editorClassName: string | undefined;
}): string | undefined {
  if (isRich) return editorClassName;

  const baseClass =
    "w-full h-8 rounded-control border border-border-default bg-surface-inset px-[9px] text-[.8125rem] text-body placeholder:text-faint transition-[border-color,box-shadow] focus:border-accent focus:ring-2 focus:ring-[var(--rui-focus-ring)] focus:outline-none";
  const shapeClass =
    editor === "textarea" ? "!h-auto min-h-[74px] resize-y !py-2 leading-[1.5]" : "";
  const invalidClass = hasError
    ? "border-danger focus:border-danger focus:ring-[var(--rui-focus-ring)]"
    : "";

  return [baseClass, shapeClass, invalidClass, editorClassName]
    .filter(Boolean)
    .join(" ");
}

/**
 * Ids for the hint and error text so the control can point at whichever is showing.
 * Without these, assistive tech reads the input with no indication that it is invalid
 * or why. The hint is hidden while an error shows, so it must drop out of
 * `aria-describedby` too — pointing at a removed node describes nothing.
 */
export function buildDescribedBy({
  name,
  description,
  hasError,
}: {
  name: string;
  description: string | undefined;
  hasError: boolean;
}): string | undefined {
  return (
    [
      hasError ? `${name}-error` : null,
      description && !hasError ? `${name}-desc` : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined
  );
}
