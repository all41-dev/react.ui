import type { EditorKind } from "../../types/column";
import type { FormGroupVariant } from "../../types/formLayout";

/**
 * Where an editor renders. The two section variants carry `FieldChrome` (label,
 * description, hint, error line); `"cell"` is the compact form for a table cell — the
 * control alone, labelled through `aria-label`, its error ringed and read from a tooltip.
 */
export type EditorVariant = FormGroupVariant | "cell";

const focusClass =
  "transition-[border-color,box-shadow] focus:border-accent focus:ring-2 focus:ring-[var(--rui-focus-ring)] focus:outline-none";

/**
 * The class string for a plain editor control.
 *
 * A 32px field on the inset surface, so it reads as an input against the panel behind
 * it rather than relying on its edge alone. No hover style — hover isn't a state a
 * text field has. A textarea opts out of the fixed control height. Rich editors carry
 * their own chrome, so they only get the consumer's own class.
 *
 * In a cell the control fills its cell at 28px on the same inset surface and border, so
 * an empty field still reads as one: without them a blank draft row looks like no row.
 */
export function buildEditorClassName({
  editor,
  isRich,
  hasError,
  editorClassName,
  variant,
}: {
  editor: EditorKind | undefined;
  isRich: boolean;
  hasError: boolean;
  editorClassName: string | undefined;
  variant?: EditorVariant;
}): string | undefined {
  if (isRich) return editorClassName;

  if (variant === "cell") {
    const cellClass = `w-full h-7 rounded-control border border-border-default bg-surface-inset px-1.5 text-[.8125rem] text-body placeholder:text-faint ${focusClass}`;
    const invalidClass = hasError
      ? "border-danger ring-1 ring-danger/40 focus:border-danger"
      : "";
    return [cellClass, invalidClass, editorClassName].filter(Boolean).join(" ");
  }

  const baseClass = `w-full h-8 rounded-control border border-border-default bg-surface-inset px-[9px] text-[.8125rem] text-body placeholder:text-faint ${focusClass}`;
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
 * Ids for the error, hint and description text so the control points at all three.
 * Without these, assistive tech reads the input with no indication that it is invalid or
 * why. The description lives in an always-present sr-only span (its visible form is the
 * label's info-icon tooltip), so it stays listed alongside the error — error first.
 */
export function buildDescribedBy({
  id,
  description,
  hasError,
  hasHint = false,
}: {
  /** The control's DOM id — `FieldChrome` derives the hint and error ids from the same. */
  id: string;
  description: string | undefined;
  hasError: boolean;
  /** A value-derived hint is rendered under the control. An error takes its place, so
      pass `false` while the field is invalid or the id points at nothing. */
  hasHint?: boolean;
}): string | undefined {
  return (
    [
      hasError ? `${id}-error` : null,
      hasHint ? `${id}-hint` : null,
      description ? `${id}-desc` : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

/**
 * The anchor attributes that show a cell editor's error in the shared tooltip on hover
 * and focus. Empty while the field is valid or no tooltip instance is in reach, so the
 * attributes never point at a tooltip nothing renders.
 */
export function cellErrorTooltipProps(
  tooltipId: string | null,
  errorMsg: string | undefined
): Record<string, string> {
  if (!tooltipId || !errorMsg) return {};
  return {
    "data-tooltip-id": tooltipId,
    "data-tooltip-content": errorMsg,
    /* Uncapped, react-tooltip lays a long message out as one line; the z-index lifts it
       over the sticky header and the overlay containers, as the description icon does. */
    "data-tooltip-class-name": "max-w-[280px] z-[1001]",
  };
}
