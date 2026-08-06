import { flexRender, type Cell } from "@tanstack/react-table";
import React from "react";

/**
 * `.og-ovwrap` — a floating action pill, not a full-height strip.
 *
 * It sits 8px off the right edge, vertically centred, on its own card surface with a
 * shadow cast leftward so it reads as hovering above the row rather than being part of
 * it. Revealed on row hover *or* `focus-within`: without the latter, tabbing into the
 * actions leaves them invisible while focused.
 *
 * The cell itself is a zero-width sticky anchor; the pill is positioned against the row.
 */
export function ActionsOverlayCell({ c }: { c: Cell<any, unknown> }) {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <td
      className="sticky right-0 z-3 !w-0 !p-0 overflow-visible border-0 bg-transparent"
      style={{ width: 0, minWidth: 0 }}
    >
      <div
        onClick={handleOverlayClick}
        className={[
          "absolute right-2 top-1/2 z-20 -translate-y-1/2",
          "flex items-center gap-[3px] rounded-lg border border-border-default p-[3px]",
          "bg-surface-card shadow-[-10px_0_18px_-12px_rgba(0,0,0,.7),0_2px_6px_-3px_rgba(0,0,0,.5)]",
          "pointer-events-none opacity-0 transition-opacity duration-100",
          "group-hover:pointer-events-auto group-hover:opacity-100",
          "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
        ].join(" ")}
      >
        {flexRender(c.column.columnDef.cell, c.getContext())}
      </div>
    </td>
  );
}
