import { flexRender, type Row } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { ActionsOverlayCell } from "./ActionsOverlayCell";
import { BodyDataCell } from "./BodyDataCell";
import React from "react";

type DataRowFragmentProps<TRow extends object> = {
  row: Row<TRow>;
  leafColCount: number;
  isEditing: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  /** Just written to — flashed briefly so the change is locatable. */
  isChanged?: boolean;
  inlineEditor?: ReactNode;
  renderExpandedRow?: (row: TRow) => ReactNode;
  onRowClick?: (row: TRow) => void;
  /** 1-based position in the whole filtered set, for `aria-rowindex`. */
  ariaRowIndex?: number;
};

function DataRowFragmentInner<TRow extends object>({
  row,
  leafColCount,
  isEditing,
  isSelected,
  isExpanded,
  isChanged,
  inlineEditor,
  renderExpandedRow,
  onRowClick,
  ariaRowIndex,
}: DataRowFragmentProps<TRow>) {
  const cells = row.getVisibleCells();
  const interactive = !!onRowClick;

  return (
    <>
      <tr
        /*
         * Hover is a faint wash of the body colour rather than a fixed background, because
         * it has to work over both the card surface and a selected row's accent tint.
         */
        className={[
          "group transition-colors duration-100",
          interactive
            ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rui-focus-ring)]"
            : "",
          isEditing || isSelected
            ? "bg-accent-subtle"
            : "hover:bg-[color-mix(in_srgb,var(--rui-text-body)_5%,transparent)]",
          /* Runs on the cells, not the row: a `<tr>` background sits behind the `<td>`
             backgrounds and the wash would not be visible. */
          isChanged ? "rui-row-changed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          isSelected || isEditing
            ? { boxShadow: "inset 3px 0 0 0 var(--rui-accent)" }
            : undefined
        }
        onClick={interactive ? () => onRowClick(row.original) : undefined}
        /*
         * The row was click-only: `onClick` and `cursor-pointer` with no tabIndex, no key
         * handler and no role, so selecting or expanding a row was impossible without a
         * pointer. Enter and Space now do what a click does — and only when there IS a
         * click handler, so a static row stays out of the tab order.
         */
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                // Let the row's own controls (checkbox, action buttons, cell editors)
                // handle their own keys rather than firing the row action too.
                if ((e.target as HTMLElement) !== e.currentTarget) return;
                e.preventDefault();
                onRowClick(row.original);
              }
            : undefined
        }
        aria-rowindex={ariaRowIndex}
        // Valid only inside a `role="grid"`, which TableView now declares.
        aria-selected={isSelected}
        aria-expanded={renderExpandedRow ? isExpanded : undefined}
      >
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
      </tr>

      {isExpanded && renderExpandedRow && (
        /* Inset surface with a hairline cast down from the row above. The left inset
           aligns the detail with the first data column, not the chevron. */
        <tr className="bg-surface-inset">
          <td
            colSpan={leafColCount}
            className="h-auto p-0 shadow-[inset_0_1px_0_var(--rui-border-default)]"
          >
            <div className="animate-slide-down pb-4 pl-11 pr-3.5 pt-3.5">
              {renderExpandedRow(row.original)}
            </div>
          </td>
        </tr>
      )}

      {isEditing && inlineEditor && (
        /* The inline form hangs off the edited row, tied to it by an accent-tinted
           top border. */
        <tr>
          <td colSpan={leafColCount} className="h-auto overflow-hidden p-0">
            <div className="animate-slide-down border-t border-[color-mix(in_srgb,var(--rui-accent)_45%,transparent)] bg-surface-inset">
              {inlineEditor}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export const DataRowFragment = React.memo(
  DataRowFragmentInner,
  <TRow extends object>(
    prev: DataRowFragmentProps<TRow>,
    next: DataRowFragmentProps<TRow>
  ) => {
    // If underlying row data object changed, we want to re-render
    if (prev.row.original !== next.row.original) return false;

    // If "visual" row state changed, we re-render
    if (prev.isEditing !== next.isEditing) return false;
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isExpanded !== next.isExpanded) return false;
    // Without this the flash never paints: a save that only changed a hidden column
    // leaves `row.original` looking equal enough for every other check here to pass.
    if (prev.isChanged !== next.isChanged) return false;

    // Layout props
    if (prev.leafColCount !== next.leafColCount) return false;
    if (prev.ariaRowIndex !== next.ariaRowIndex) return false;

    // Callbacks & renderers
    if (prev.inlineEditor !== next.inlineEditor) return false;
    if (prev.renderExpandedRow !== next.renderExpandedRow) return false;
    if (prev.onRowClick !== next.onRowClick) return false;

    // If all of that is equal, skip re-render
    return true;
  }
) as typeof DataRowFragmentInner;
