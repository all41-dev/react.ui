import { ExpandedRowPanel, InlineEditorRow, RowCells } from "./DataRowParts";
import { dataRowPropsEqual, type DataRowFragmentProps } from "./dataRowProps";
import React from "react";

function DataRowFragmentInner<TRow extends object>({
  row,
  leafCols,
  isEditing,
  isSelected,
  isExpanded,
  isChanged,
  inlineEditor,
  viewportWidth,
  renderExpandedRow,
  onRowClick,
  ariaRowIndex,
  treeDepth,
  hasChildren = false,
  isOpen = false,
}: DataRowFragmentProps<TRow>) {
  const cells = row.getVisibleCells();
  const leafColCount = leafCols.length;
  const interactive = !!onRowClick;
  const inTree = treeDepth !== undefined;
  const node = inTree ? { depth: treeDepth, hasChildren, isOpen } : undefined;
  /* In a treegrid `aria-expanded` marks a row as a parent node, so a leaf carries none
     whether or not it has a detail panel. A flat grid's row reports its panel. */
  const nodeState = hasChildren ? isOpen : undefined;
  const panelState = renderExpandedRow ? isExpanded : undefined;

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
        aria-level={inTree ? treeDepth + 1 : undefined}
        aria-expanded={inTree ? nodeState : panelState}
      >
        <RowCells cells={cells} node={node} />
      </tr>

      {isExpanded && renderExpandedRow && (
        <ExpandedRowPanel leafColCount={leafColCount}>
          {renderExpandedRow(row.original)}
        </ExpandedRowPanel>
      )}

      {isEditing && inlineEditor && (
        <InlineEditorRow leafColCount={leafColCount} viewportWidth={viewportWidth}>
          {inlineEditor}
        </InlineEditorRow>
      )}
    </>
  );
}

export const DataRowFragment = React.memo(
  DataRowFragmentInner,
  dataRowPropsEqual
) as typeof DataRowFragmentInner;
