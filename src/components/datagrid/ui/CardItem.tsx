import { flexRender, type Row } from "@tanstack/react-table";
import type { ReactNode } from "react";

/** Shared by the flat cards grid and the kanban columns. */
export function CardItem<TRow extends object>({
  row,
  card,
  selected,
  onRowClick,
  expanded = false,
  renderExpandedRow,
}: {
  row: Row<TRow>;
  card: (row: TRow) => ReactNode;
  selected: boolean;
  onRowClick?: (row: TRow) => void;
  expanded?: boolean;
  renderExpandedRow?: (row: TRow) => ReactNode;
}) {
  const cells = row.getVisibleCells();
  const selectCell = cells.find((c) => c.column.id === "__select__");
  const actionCell = cells.find((c) => c.column.id === "__actions__");

  return (
    <div
      onClick={() => onRowClick?.(row.original)}
      /*
       * Mirrors the table row's keyboard contract (DataRowFragment): a clickable card is
       * focusable and Enter/Space do what a click does — and only when there IS a click
       * handler, so a static card stays out of the tab order. The target guard leaves the
       * card's own controls (checkbox, action buttons) to handle their own keys.
       */
      tabIndex={onRowClick ? 0 : undefined}
      /*
       * NOT `role="button"`. `button` is one of the roles with presentational children —
       * browsers prune the whole subtree from the accessibility tree — which would delete
       * the card's own checkbox and action buttons for a screen reader. `group` carries no
       * such rule. (The table row gets away with `role="row"` for the same reason.)
       */
      role={onRowClick ? "group" : undefined}
      onKeyDown={
        onRowClick
          ? (e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              if (e.target !== e.currentTarget) return;
              e.preventDefault();
              onRowClick(row.original);
            }
          : undefined
      }
      /*
       * No `aria-selected` here: it isn't supported on `group` (nor on `button`), and the
       * card's own checkbox already announces the state now that it is back in the
       * accessibility tree. The table row keeps its `aria-selected` — `row` inside
       * `role="grid"` is one of the roles that does support it.
       */
      data-selected={selected || undefined}
      /*
       * Selection is an accent border plus a 1px ring, not a tinted fill — tinting the
       * card would shift the contrast of everything inside it just to mark a checkbox.
       */
      className={[
        "group/card relative flex flex-col rounded-control border transition-[transform,box-shadow,border-color] duration-150",
        "bg-surface-card shadow-[var(--elev-1)]",
        "hover:-translate-y-px hover:border-border-translucent hover:shadow-[0_6px_16px_-8px_rgba(0,0,0,.45)]",
        selected ? "border-accent shadow-[0_0_0_1px_var(--rui-accent)]" : "border-border-default",
        onRowClick
          ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
          : "",
      ].join(" ")}
    >
      {selectCell && (
        <div
          // Visible on hover or while selected.
          className={[
            "absolute right-2.5 top-2.5 z-10 transition-opacity",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover/card:opacity-100 focus-within:opacity-100",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
        </div>
      )}

      <div className="min-w-0 flex-1 p-3">{card(row.original)}</div>

      {expanded && renderExpandedRow && (
        /*
         * The table's expansion panel, relocated between body and footer. The panel is
         * usually table-shaped and wider than a 268px card, so it scrolls sideways
         * inside its own box rather than stretching the card's grid column.
         */
        <div
          className="animate-slide-down overflow-x-auto border-t border-[color-mix(in_srgb,var(--rui-border-default)_70%,transparent)] bg-surface-inset px-3 py-2.5 scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          {renderExpandedRow(row.original)}
        </div>
      )}

      {actionCell && (
        /*
         * Actions stay visible here rather than revealing on hover like the table row's
         * pill — a touch device has no hover, and the footer has the room for them.
         * `mt-auto` pins the footer to the bottom of uneven cards in a grid row.
         */
        <div
          className="mt-auto flex items-center justify-end gap-2 border-t border-[color-mix(in_srgb,var(--rui-border-default)_70%,transparent)] px-3 py-2"
          onClick={(e) => e.stopPropagation()}
        >
          {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
        </div>
      )}
    </div>
  );
}
