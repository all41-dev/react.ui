import { flexRender, type Cell } from "@tanstack/react-table";
import React from "react";

export function ActionsOverlayCell({
  c,
  rowBgClass,
}: {
  c: Cell<any, unknown>;
  rowBgClass: string;
}) {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <td
      className="sticky right-0 !w-0 !p-0 overflow-visible"
      style={{ width: 0, minWidth: 0 }}
    >
      <div
        onClick={handleOverlayClick}
        className={[
          "pointer-events-auto",
          "absolute inset-y-0 right-0 flex items-center gap-1 h-full px-2",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          rowBgClass,
          "z-20",
          "border-b border-gray-200",
          "rounded-l-md",
          "bg-clip-padding",
        ].join(" ")}
      >
        {flexRender(c.column.columnDef.cell, c.getContext())}
      </div>
    </td>
  );
}
