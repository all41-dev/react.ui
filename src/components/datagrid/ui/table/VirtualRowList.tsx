import type { Column } from "@tanstack/react-table";
import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import { useContext, type ReactNode } from "react";
import { DataGridContext } from "../../DataGridContext";
import type { BodyItem } from "../../hooks/useVirtualRows";
import { DataRowFragment } from "./DataRowFragment";
import type { RenderEditingRow } from "./EditingRow";
import { GroupHeaderRow } from "./GroupHeaderRow";

type VirtualRowListProps<TRow extends object> = {
  items: BodyItem<TRow>[];
  virtualItems: VirtualItem[];
  measureElement: Virtualizer<HTMLDivElement, Element>["measureElement"];
  leafCols: Column<TRow, unknown>[];
  /** Header rows come first under `role="grid"`, so body rows start after them. */
  rowIndexOffset: number;
  collapsedGroups?: ReadonlySet<string>;
  onToggleGroup?: (key: string) => void;
  /* Row keys below are all TanStack `row.id`s, i.e. the grid's own `getRowId` value. */
  editingRowId?: string;
  inlineEditor?: ReactNode;
  /** Row mode: draws the row in session in place of its cells. */
  renderEditingRow?: RenderEditingRow<TRow>;
  /** Visible width of the scroll wrapper, for the inline form. */
  viewportWidth?: number;
  selectedRowId?: string;
  selectedRowIds?: ReadonlySet<string>;
  onRowClick?: (row: TRow) => void;
  expandedRowIds?: ReadonlySet<string>;
  renderExpandedRow?: (row: TRow) => ReactNode;
  changedRowId?: string;
};

/** The mounted window of body rows: group headers and data rows, one tbody each. */
export function VirtualRowList<TRow extends object>({
  items,
  virtualItems,
  measureElement,
  leafCols,
  rowIndexOffset,
  collapsedGroups,
  onToggleGroup,
  editingRowId,
  inlineEditor,
  renderEditingRow,
  viewportWidth,
  selectedRowId,
  selectedRowIds,
  onRowClick,
  expandedRowIds,
  renderExpandedRow,
  changedRowId,
}: VirtualRowListProps<TRow>) {
  const treeMode = !!useContext(DataGridContext)?.tree;

  return (
    <>
      {virtualItems.map((virtualRow) => {
        const item = items[virtualRow.index];
        if (!item) return null;

        if (item.kind === "group") {
          return (
            <tbody
              key={`g:${item.group.key}`}
              ref={measureElement}
              data-index={virtualRow.index}
            >
              <GroupHeaderRow
                group={item.group}
                leafColumns={leafCols}
                collapsed={collapsedGroups?.has(item.group.key) ?? false}
                onToggle={() => onToggleGroup?.(item.group.key)}
              />
            </tbody>
          );
        }

        if (item.kind === "draft") {
          /* The draft is the create session in row mode, placed by `useVirtualRows`. A
             draft has no children and no chevron; its depth is its parent's plus one. */
          if (!renderEditingRow) return null;
          return (
            <tbody key="draft" ref={measureElement} data-index={virtualRow.index}>
              {renderEditingRow({
                leafCols,
                node: treeMode
                  ? { depth: item.depth, hasChildren: false, isOpen: false }
                  : undefined,
                ariaRowIndex: virtualRow.index + 1 + rowIndexOffset,
              })}
            </tbody>
          );
        }

        const r = item.row;
        // `row.id` is the grid's own key — the table is configured with `getRowId`.
        const key = r.id;
        const isEditing = editingRowId !== undefined && key === editingRowId;
        const isSelected =
          selectedRowId === key || (selectedRowIds?.has(key) ?? false);
        const isExpanded = expandedRowIds?.has(key) ?? false;
        const isChanged = changedRowId === key;
        /* Read off the row in hand: sorting hands out copies whose `subRows` are the
           sorted children, and a filter drops the children that are not kept. */
        const hasChildren = treeMode && r.subRows.length > 0;
        const isOpen = hasChildren && r.getIsExpanded();
        const ariaRowIndex = virtualRow.index + 1 + rowIndexOffset;

        /* The row in session is its own component, a sibling of the memoised rows: its
           editors re-render on every keystroke and nothing else should. */
        if (isEditing && renderEditingRow) {
          return (
            <tbody key={key} ref={measureElement} data-index={virtualRow.index}>
              {renderEditingRow({
                row: r,
                leafCols,
                node: treeMode ? { depth: r.depth, hasChildren, isOpen } : undefined,
                ariaRowIndex,
              })}
            </tbody>
          );
        }

        return (
          /* No zebra striping — rows sit on the card surface, separated by the
             cell hairline alone. `data-row-key` is how focus finds the row after a
             session closes on it. */
          <tbody
            key={key}
            ref={measureElement}
            data-index={virtualRow.index}
            data-row-key={key}
          >
            <DataRowFragment
              row={r}
              /* 1-based, counted over the flat body list rather than the mounted
                 window — the virtualizer only keeps a slice in the DOM — and
                 offset past the header rows, which are rows 1..n of the grid. */
              ariaRowIndex={ariaRowIndex}
              /* Also the memo comparator's window into the column model: its
                 identity changes on reorder/visibility/def swaps while the Row
                 objects don't. Passing a count here instead reintroduces the
                 stale-cell-order bug. */
              leafCols={leafCols}
              isEditing={isEditing}
              isSelected={isSelected}
              isExpanded={isExpanded}
              isChanged={isChanged}
              treeDepth={treeMode ? r.depth : undefined}
              hasChildren={hasChildren}
              isOpen={isOpen}
              inlineEditor={isEditing ? inlineEditor : undefined}
              viewportWidth={viewportWidth}
              renderExpandedRow={renderExpandedRow}
              onRowClick={onRowClick}
            />
          </tbody>
        );
      })}
    </>
  );
}
