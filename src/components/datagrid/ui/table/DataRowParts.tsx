import { flexRender, type Cell } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { ActionsOverlayCell } from "./ActionsOverlayCell";
import { BodyDataCell } from "./BodyDataCell";

/** One `<td>` per visible cell, routed by column kind. */
export function RowCells<TRow extends object>({
  cells,
}: {
  cells: Cell<TRow, unknown>[];
}) {
  return (
    <>
      {cells.map((c) => {
        if (c.column.id === "__actions__") {
          return <ActionsOverlayCell key={c.id} c={c} />;
        }
        if (c.column.id === "__select__") {
          return (
            <td
              key={c.id}
              className="h-10 w-[36px] border-b border-[color-mix(in_srgb,var(--rui-border-default)_65%,transparent)] px-2.5 align-middle"
              // Checkbox clicks must never double as row clicks.
              onClick={(e) => e.stopPropagation()}
            >
              {flexRender(c.column.columnDef.cell, c.getContext())}
            </td>
          );
        }
        return <BodyDataCell key={c.id} c={c} />;
      })}
    </>
  );
}

/** The expanded-row detail, rendered as its own full-width `<tr>` under the data row. */
export function ExpandedRowPanel({
  leafColCount,
  children,
}: {
  leafColCount: number;
  children: ReactNode;
}) {
  return (
    /* Inset surface with a hairline cast down from the row above. The left inset
       aligns the detail with the first data column, not the chevron. */
    <tr className="bg-surface-inset">
      <td
        colSpan={leafColCount}
        className="h-auto p-0 shadow-[inset_0_1px_0_var(--rui-border-default)]"
      >
        <div className="animate-slide-down pb-4 pl-11 pr-3.5 pt-3.5">
          {children}
        </div>
      </td>
    </tr>
  );
}

/**
 * The inline edit form's surface, tied to the row above it by an accent border.
 *
 * The cell it sits in spans every column, so it is as wide as the table — wider than the
 * scroll wrapper whenever the columns overflow it. Pinned to the wrapper's visible width
 * instead, so the fields and the Save button stay on screen rather than sitting off to
 * the right behind a horizontal scroll. The cell must not clip: `overflow: hidden` on an
 * ancestor takes the sticky panel out of the wrapper's scrollport.
 */
export function InlineEditorPanel({
  viewportWidth,
  children,
}: {
  viewportWidth?: number;
  children: ReactNode;
}) {
  return (
    <div
      className="animate-slide-down sticky left-0 border-t border-[color-mix(in_srgb,var(--rui-accent)_45%,transparent)] bg-surface-inset"
      style={viewportWidth ? { width: `${viewportWidth}px` } : undefined}
    >
      {children}
    </div>
  );
}

/** The inline edit form hanging off the edited row, as its own full-width `<tr>`. */
export function InlineEditorRow({
  leafColCount,
  viewportWidth,
  children,
}: {
  leafColCount: number;
  /** Visible width of the scroll wrapper — see `InlineEditorPanel`. */
  viewportWidth?: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={leafColCount} className="h-auto p-0">
        <InlineEditorPanel viewportWidth={viewportWidth}>
          {children}
        </InlineEditorPanel>
      </td>
    </tr>
  );
}
