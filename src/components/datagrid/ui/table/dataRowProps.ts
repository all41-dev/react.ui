import type { Column, Row } from "@tanstack/react-table";
import type { ReactNode } from "react";

export type DataRowFragmentProps<TRow extends object> = {
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
  /** Visible width of the scroll wrapper, for the inline form — see `InlineEditorPanel`. */
  viewportWidth?: number;
  renderExpandedRow?: (row: TRow) => ReactNode;
  onRowClick?: (row: TRow) => void;
  /** 1-based position in the whole filtered set, for `aria-rowindex`. */
  ariaRowIndex?: number;
  /** Tree mode only: 0 for a root. `undefined` in a flat grid. */
  treeDepth?: number;
  hasChildren?: boolean;
  /** The node's children are shown. Not the detail panel — that is `isExpanded`. */
  isOpen?: boolean;
};

/** The memo comparator of `DataRowFragment`: `true` skips the re-render. */
export function dataRowPropsEqual<TRow extends object>(
  prev: DataRowFragmentProps<TRow>,
  next: DataRowFragmentProps<TRow>
): boolean {
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
  /* Opening or closing a node returns the same `Row` objects, so nothing above sees
     it: without these the chevron and the indent keep their old state. */
  if (prev.treeDepth !== next.treeDepth) return false;
  if (prev.hasChildren !== next.hasChildren) return false;
  if (prev.isOpen !== next.isOpen) return false;

  // Layout props
  if (prev.ariaRowIndex !== next.ariaRowIndex) return false;
  if (prev.viewportWidth !== next.viewportWidth) return false;

  // Callbacks & renderers
  if (prev.inlineEditor !== next.inlineEditor) return false;
  if (prev.renderExpandedRow !== next.renderExpandedRow) return false;
  if (prev.onRowClick !== next.onRowClick) return false;

  // If all of that is equal, skip re-render
  return true;
}
