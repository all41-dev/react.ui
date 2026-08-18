import { Info } from "lucide-react";

import { useDataGridContext } from "../../DataGridContext";

/**
 * Info icon next to a field label carrying the column's `description` in the grid's
 * shared tooltip (hover and keyboard focus). The sr-only span is the target of the
 * control's `aria-describedby` and doubles as the anchor's accessible name — it sits
 * outside the `<label>` element so the description never leaks into the control's name.
 */
export function FieldDescriptionIcon({
  descriptionId,
  description,
}: {
  /** DOM id the control's `aria-describedby` points at. */
  descriptionId: string;
  description: string;
}) {
  const { tooltipId } = useDataGridContext();

  return (
    <span
      tabIndex={0}
      data-tooltip-id={tooltipId}
      data-tooltip-content={description}
      /* react-tooltip's core style is `width: max-content` — uncapped, a long
         description spans the viewport as one line. The z-index lifts the shared
         tooltip above the `z-[1000]` overlay edit containers it renders behind. */
      data-tooltip-class-name="max-w-[280px] z-[1001]"
      className="inline-flex shrink-0 rounded-sm text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
    >
      <Info className="h-3 w-3" aria-hidden />
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
    </span>
  );
}
