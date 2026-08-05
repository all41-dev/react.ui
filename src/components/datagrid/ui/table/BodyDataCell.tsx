import { flexRender, type Cell } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { useContext } from "react";
import { DataGridContext } from "../../DataGridContext";
import type { ColumnMeta } from "../../types/column";
import { CellWithTooltip } from "./CellWithTooltip";

export function BodyDataCell({ c }: { c: Cell<any, unknown> }) {
  const ctx = useContext(DataGridContext);
  const m = (c.column.columnDef as any).meta as
    | ColumnMeta<any, any>
    | undefined;
  const paddingClass = m?.cellClassName ?? "px-3 py-2";
  const rendered = flexRender(c.column.columnDef.cell, c.getContext());
  const value = typeof c.getValue === "function" ? c.getValue() : undefined;

  const canCellEdit = !!(m?.cellEdit && m?.editor && ctx?.startCellEdit);

  return (
    <td
      data-col-id={c.column.id}
      className={[
        "border-b border-border-default text-sm align-middle",
        paddingClass,
        m?.hideOnMobile ? "hidden md:table-cell" : "",
      ].join(" ")}
    >
      {canCellEdit ? (
        <button
          type="button"
          title="Click to edit"
          onClick={(e) => {
            // The row's own click (select/expand) must not fire alongside the editor.
            e.stopPropagation();
            ctx!.startCellEdit!(c.row.original, c.column.id, e.currentTarget);
          }}
          className="group/ce flex w-full cursor-pointer items-center gap-1.5 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
        >
          <span className="min-w-0 flex-1">
            <CellWithTooltip
              meta={m}
              value={value}
              row={c.row.original}
              rendered={rendered}
              className="block whitespace-nowrap overflow-hidden text-ellipsis"
            />
          </span>
          <Pencil
            className="h-3 w-3 shrink-0 text-faint opacity-0 transition-opacity group-hover/ce:opacity-100"
            aria-hidden
          />
        </button>
      ) : (
        <CellWithTooltip
          meta={m}
          value={value}
          row={c.row.original}
          rendered={rendered}
          className="block whitespace-nowrap overflow-hidden text-ellipsis"
        />
      )}
    </td>
  );
}
