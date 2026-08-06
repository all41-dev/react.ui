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
      aria-selected={selected || undefined}
      /*
       * Selection is an accent border plus a 1px ring, not a tinted fill — tinting the
       * card would shift the contrast of everything inside it just to mark a checkbox.
       */
      className={[
        "group/card relative flex flex-col rounded-control border transition-[transform,box-shadow,border-color] duration-150",
        "bg-surface-card shadow-[var(--elev-1)]",
        "hover:-translate-y-px hover:border-border-translucent hover:shadow-[0_6px_16px_-8px_rgba(0,0,0,.45)]",
        selected ? "border-accent shadow-[0_0_0_1px_var(--rui-accent)]" : "border-border-default",
        onRowClick ? "cursor-pointer" : "",
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
