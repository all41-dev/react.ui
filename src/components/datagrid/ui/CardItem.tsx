import { flexRender, type Row } from "@tanstack/react-table";
import type { ReactNode } from "react";

/** Shared by the flat cards grid and the kanban columns. */
export function CardItem<TRow extends object>({
  row,
  card,
  selected,
  onRowClick,
}: {
  row: Row<TRow>;
  card: (row: TRow) => ReactNode;
  selected: boolean;
  onRowClick?: (row: TRow) => void;
}) {
  const cells = row.getVisibleCells();
  const selectCell = cells.find((c) => c.column.id === "__select__");
  const actionCell = cells.find((c) => c.column.id === "__actions__");

  return (
    <div
      onClick={() => onRowClick?.(row.original)}
      aria-selected={selected || undefined}
      className={[
        "group/card relative flex flex-col rounded-lg border transition-all duration-150",
        "hover:-translate-y-px hover:shadow-md",
        // Exclusive — emitting both bg utilities would leave the winner to stylesheet
        // order rather than intent.
        selected
          ? "border-accent bg-accent-subtle"
          : "border-border-default bg-surface-card",
        onRowClick ? "cursor-pointer" : "",
      ].join(" ")}
    >
      {selectCell && (
        <div
          // Visible on hover or while selected, per spec.
          className={[
            "absolute right-2 top-2 z-10 transition-opacity",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover/card:opacity-100 focus-within:opacity-100",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
        </div>
      )}

      <div className="min-w-0 flex-1 p-4">{card(row.original)}</div>

      {actionCell && (
        // Always visible here — no hover-reveal, unlike table rows.
        //
        // `relative` + a floor height are load-bearing: the action cell's own content is
        // `md:absolute top-0 right-0 h-full`, so without a positioned ancestor it would
        // anchor to the card and land on top of the checkbox. Containing it here pins it
        // to the footer's right edge, and the floor keeps the footer from collapsing now
        // that its only child is taken out of flow.
        <div
          className="relative min-h-[38px] border-t border-border-default px-2"
          onClick={(e) => e.stopPropagation()}
        >
          {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
        </div>
      )}
    </div>
  );
}
