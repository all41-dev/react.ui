import { flexRender, type Cell } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import { useContext } from "react";
import { DataGridContext } from "../../DataGridContext";
import { useIsTruncated } from "../../hooks/useIsTruncated";
import { readAccessorKey, readColumnMeta } from "../../utils/readColumnDef";
import { CellWithTooltip } from "./CellWithTooltip";

export function BodyDataCell<TRow extends object>({
  c,
}: {
  c: Cell<TRow, unknown>;
}) {
  const ctx = useContext(DataGridContext);
  const { ref: contentRef, truncated, measure } = useIsTruncated<HTMLSpanElement>();
  const m = readColumnMeta(c.column.columnDef);
  const paddingClass = m?.cellClassName ?? "px-3";
  const raw = typeof c.getValue === "function" ? c.getValue() : undefined;

  /*
   * The only place `format` is applied. It is display-only — never use it to seed the
   * edit form, or a column rendering 1234 as "1 234 €" puts that string in the input.
   * `toForm` / `fromForm` are the form's hooks.
   *
   * A custom `cell` renderer is the lower-level hook and stays in charge of its own
   * output; declaring both means `format` decides the value and `cell` is bypassed.
   */
  const formatted = m?.format ? m.format(raw, c.row.original) : undefined;
  const rendered = m?.format
    ? (formatted as React.ReactNode)
    : flexRender(c.column.columnDef.cell, c.getContext());
  // The tooltip echoes what is on screen — it exists because that text is clipped.
  const value = m?.format ? formatted : raw;

  /* A cell edit round-trips through the form, which is keyed by the accessor key, so a
     column with only an `accessorFn` has nothing to seed the editor from or write back
     to — offering the affordance would open an empty popover. */
  const hasAccessorKey = !!readAccessorKey(c.column.columnDef);
  const canCellEdit = !!(
    m?.cellEdit &&
    m?.editor &&
    hasAccessorKey &&
    ctx?.canCellEdit
  );

  return (
    <td
      data-col-id={c.column.id}
      onMouseEnter={measure}
      /* `focusin` bubbles, so this also fires when the cell-edit button below takes
         focus — its accessible name is the clipped text, and a keyboard user has no
         other way to read the rest of it. */
      onFocus={measure}
      /*
       * A hairline at 65% opacity, so a dense grid doesn't read as a wireframe. Text size
       * is inherited from the grid root rather than set here.
       */
      className={[
        "h-10 align-middle border-b border-[color-mix(in_srgb,var(--rui-border-default)_65%,transparent)]",
        paddingClass,
        m?.mono ? "font-mono text-[.75rem] text-muted" : "",
        m?.align === "right"
          ? "text-right"
          : m?.align === "center"
            ? "text-center"
            : "",
      ].join(" ")}
    >
      {canCellEdit ? (
        <button
          type="button"
          title="Click to edit"
          onClick={(e) => {
            // The row's own click (select/expand) must not fire alongside the editor.
            e.stopPropagation();
            ctx!.startCellEdit(c.row.original, c.column.id, e.currentTarget);
          }}
          /* A text cursor rather than a pointer: this edits in place, it doesn't
             navigate. The negative margin lets the hover chrome bleed into the cell
             padding so the target lines up with the text it replaces. */
          className="group/ce -mx-1 flex w-full cursor-text items-center gap-1.5 rounded-[5px] border border-transparent px-1 py-0.5 text-left outline-none hover:border-border-translucent hover:bg-surface-inset focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
        >
          <span className="min-w-0 flex-1">
            <CellWithTooltip
              meta={m}
              value={value}
              row={c.row.original}
              rendered={rendered}
              contentRef={contentRef}
              truncated={truncated}
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
          contentRef={contentRef}
          truncated={truncated}
          className="block whitespace-nowrap overflow-hidden text-ellipsis"
        />
      )}
    </td>
  );
}
