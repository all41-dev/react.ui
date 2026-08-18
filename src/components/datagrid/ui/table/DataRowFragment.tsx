import { type Column, type Row } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { ExpandedRowPanel, InlineEditorRow, RowCells } from "./DataRowParts";
import React from "react";

type DataRowFragmentProps<TRow extends object> = {
  row: Row<TRow>;
  /**
   * The visible column model, from `table.getVisibleLeafColumns()`. Its identity is what
   * the memo comparator watches: TanStack rebuilds this array on column reorder, hide/show
   * and def swaps, while the `Row` objects themselves stay the same.
   */
  leafCols: Column<TRow, unknown>[];
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
  leafCols,
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
  const leafColCount = leafCols.length;
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
        /* Enter and Space do what a click does. Wired only when the row is interactive —
           a static row must stay out of the tab order. */
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
        <RowCells cells={cells} />
      </tr>

      {isExpanded && renderExpandedRow && (
        <ExpandedRowPanel leafColCount={leafColCount}>
          {renderExpandedRow(row.original)}
        </ExpandedRowPanel>
      )}

      {isEditing && inlineEditor && (
        <InlineEditorRow leafColCount={leafColCount}>
          {inlineEditor}
        </InlineEditorRow>
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

    /*
     * TanStack `Row` objects read live table state, so on a column reorder / hide / def
     * swap the SAME `Row` instances come back and every other prop here compares equal —
     * the row would skip the re-render that re-reads `row.getVisibleCells()` and keep
     * painting data in the old cell order under the new header order. `leafCols` is the
     * column-model-sensitive prop that catches this; any future comparator change must
     * keep one like it in the comparison.
     */
    if (prev.leafCols !== next.leafCols) return false;

    // If "visual" row state changed, we re-render
    if (prev.isEditing !== next.isEditing) return false;
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isExpanded !== next.isExpanded) return false;
    // Without this the flash never paints: a save that only changed a hidden column
    // leaves `row.original` looking equal enough for every other check here to pass.
    if (prev.isChanged !== next.isChanged) return false;

    // Layout props
    if (prev.ariaRowIndex !== next.ariaRowIndex) return false;

    // Callbacks & renderers
    if (prev.inlineEditor !== next.inlineEditor) return false;
    if (prev.renderExpandedRow !== next.renderExpandedRow) return false;
    if (prev.onRowClick !== next.onRowClick) return false;

    // If all of that is equal, skip re-render
    return true;
  }
) as typeof DataRowFragmentInner;
