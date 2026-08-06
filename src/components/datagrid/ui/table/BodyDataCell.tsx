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
  const paddingClass = m?.cellClassName ?? "px-3";
  const rendered = flexRender(c.column.columnDef.cell, c.getContext());
  const value = typeof c.getValue === "function" ? c.getValue() : undefined;

  const canCellEdit = !!(m?.cellEdit && m?.editor && ctx?.startCellEdit);

  return (
    <td
      data-col-id={c.column.id}
      /*
       * `.og td` — 40px, and a hairline at 65% opacity so a dense grid doesn't read as
       * a wireframe. Text size is inherited from the grid root (.8125rem); it used to
       * be forced to `text-sm`, a size that appears nowhere in the design.
       */
      className={[
        "h-10 align-middle border-b border-[color-mix(in_srgb,var(--rui-border-default)_65%,transparent)]",
        paddingClass,
        // `mono` and `align` were declared in ColumnMeta but read nowhere.
        m?.mono ? "font-mono text-[.75rem] text-muted" : "",
        m?.align === "right"
          ? "text-right"
          : m?.align === "center"
            ? "text-center"
            : "",
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
          /* `.og-cellbtn` — a text cursor, not a pointer: it edits in place rather than
             navigating. The negative margin lets the hover chrome bleed into the cell
             padding so the target lines up with the text it replaces. */
          className="group/ce -mx-1 flex w-full cursor-text items-center gap-1.5 rounded-[5px] border border-transparent px-1 py-0.5 text-left outline-none hover:border-border-translucent hover:bg-surface-inset focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
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
