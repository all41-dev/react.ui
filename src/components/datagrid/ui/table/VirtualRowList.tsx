import type { Column } from "@tanstack/react-table";
import type { VirtualItem, Virtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import type { BodyItem } from "../../hooks/useVirtualRows";
import { DataRowFragment } from "./DataRowFragment";
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
  selectedRowId,
  selectedRowIds,
  onRowClick,
  expandedRowIds,
  renderExpandedRow,
  changedRowId,
}: VirtualRowListProps<TRow>) {
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

        const r = item.row;
        // `row.id` is the grid's own key — the table is configured with `getRowId`.
        const key = r.id;
        const isEditing = editingRowId !== undefined && key === editingRowId;
        const isSelected =
          selectedRowId === key || (selectedRowIds?.has(key) ?? false);
        const isExpanded = expandedRowIds?.has(key) ?? false;
        const isChanged = changedRowId === key;

        return (
          /* No zebra striping — rows sit on the card surface, separated by the
             cell hairline alone. */
          <tbody
            key={key}
            ref={measureElement}
            data-index={virtualRow.index}
          >
            <DataRowFragment
              row={r}
              /* 1-based, counted over the flat body list rather than the mounted
                 window — the virtualizer only keeps a slice in the DOM — and
                 offset past the header rows, which are rows 1..n of the grid. */
              ariaRowIndex={virtualRow.index + 1 + rowIndexOffset}
              /* Also the memo comparator's window into the column model: its
                 identity changes on reorder/visibility/def swaps while the Row
                 objects don't. Passing a count here instead reintroduces the
                 stale-cell-order bug. */
              leafCols={leafCols}
              isEditing={isEditing}
              isSelected={isSelected}
              isExpanded={isExpanded}
              isChanged={isChanged}
              inlineEditor={isEditing ? inlineEditor : undefined}
              renderExpandedRow={renderExpandedRow}
              onRowClick={onRowClick}
            />
          </tbody>
        );
      })}
    </>
  );
}
