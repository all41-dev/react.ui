import { flexRender, type Cell } from "@tanstack/react-table";
import type { ColumnMeta } from "../../types/column";
import { CellWithTooltip } from "./CellWithTooltip";

export function BodyDataCell({ c }: { c: Cell<any, unknown> }) {
  const m = (c.column.columnDef as any).meta as
    | ColumnMeta<any, any>
    | undefined;
  const paddingClass = m?.cellClassName ?? "px-3 py-2";
  const rendered = flexRender(c.column.columnDef.cell, c.getContext());
  const value = typeof c.getValue === "function" ? c.getValue() : undefined;

  return (
    <td
      data-col-id={c.column.id}
      className={[
        "border-b border-gray-200 text-sm align-middle",
        paddingClass,
        m?.hideOnMobile ? "hidden md:table-cell" : "",
      ].join(" ")}
    >
      <CellWithTooltip
        meta={m}
        value={value}
        rendered={rendered}
        className="block whitespace-nowrap overflow-hidden text-ellipsis"
      />
    </td>
  );
}
