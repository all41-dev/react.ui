import type { Column, Row, Table } from "@tanstack/react-table";
import type { Virtualizer, VirtualItem } from "@tanstack/react-virtual";
import type { ReactNode } from "react";

import type { BodyItem } from "../../hooks/useVirtualRows";
import type { RenderEditingRow } from "./EditingRow";
import {
  CreatingEditorBody,
  EmptyBody,
  PaddingBody,
  SkeletonBody,
} from "./TableStateBodies";
import { VirtualRowList } from "./VirtualRowList";

type GridBodiesProps<TRow extends object> = {
  table: Table<TRow>;
  isLoading: boolean;
  /** `isLoading` past the loading delay: drives the skeleton's bars, not its space. */
  loadingShown: boolean;
  error: string | Error | null;
  emptyLabel?: string;
  /** Column count for every colSpan in here — see the note in `TableView`. */
  leafColCount: number;
  leafCols: Column<TRow, unknown>[];
  items: BodyItem<TRow>[];
  virtualItems: VirtualItem[];
  measureElement: Virtualizer<HTMLDivElement, Element>["measureElement"];
  paddingTop: number;
  paddingBottom: number;
  rowIndexOffset: number;
  collapsedGroups?: ReadonlySet<string>;
  onToggleGroup?: (key: string) => void;
  editingRowId?: string;
  inlineEditor?: ReactNode;
  /** Row mode: the row in session, or the draft (a `draft` body item), in table cells. */
  renderEditingRow?: RenderEditingRow<TRow>;
  /** Visible width of the scroll wrapper, for the inline form. */
  viewportWidth?: number;
  /** Inline mode: the create form renders as the first body. */
  isCreating?: boolean;
  selectedRowId?: string;
  selectedRowIds?: ReadonlySet<string>;
  onRowClick?: (row: TRow) => void;
  expandedRowIds?: ReadonlySet<string>;
  renderExpandedRow?: (row: Row<TRow>["original"]) => ReactNode;
  changedRowId?: string;
};

/** Every `<tbody>` under the head, in paint order: skeleton, create row, rows, states. */
export function GridBodies<TRow extends object>({
  table,
  isLoading,
  loadingShown,
  error,
  emptyLabel,
  leafColCount,
  leafCols,
  items,
  virtualItems,
  measureElement,
  paddingTop,
  paddingBottom,
  rowIndexOffset,
  collapsedGroups,
  onToggleGroup,
  editingRowId,
  inlineEditor,
  renderEditingRow,
  viewportWidth,
  isCreating,
  selectedRowId,
  selectedRowIds,
  onRowClick,
  expandedRowIds,
  renderExpandedRow,
  changedRowId,
}: GridBodiesProps<TRow>) {
  return (
    <>
      <SkeletonBody
        table={table}
        isLoading={isLoading}
        loadingShown={loadingShown}
        cols={leafColCount}
      />

      {isCreating && inlineEditor && (
        <CreatingEditorBody
          leafColCount={leafColCount}
          viewportWidth={viewportWidth}
        >
          {inlineEditor}
        </CreatingEditorBody>
      )}

      <PaddingBody height={paddingTop} colSpan={leafColCount} />

      {/* Rows stay mounted while loading — don't gate them on `!isLoading`. The skeleton
          above covers the first load only, so hiding the rows on a refresh collapses the
          grid to header height and snaps back when the data returns. GridBody's scrim is
          what says "loading", the same way CardsView keeps its cards. */}
      <VirtualRowList
        items={items}
        virtualItems={virtualItems}
        measureElement={measureElement}
        leafCols={leafCols}
        rowIndexOffset={rowIndexOffset}
        collapsedGroups={collapsedGroups}
        onToggleGroup={onToggleGroup}
        editingRowId={editingRowId}
        inlineEditor={inlineEditor}
        renderEditingRow={renderEditingRow}
        viewportWidth={viewportWidth}
        selectedRowId={selectedRowId}
        selectedRowIds={selectedRowIds}
        onRowClick={onRowClick}
        expandedRowIds={expandedRowIds}
        renderExpandedRow={renderExpandedRow}
        changedRowId={changedRowId}
      />

      <PaddingBody height={paddingBottom} colSpan={leafColCount} />

      <EmptyBody
        table={table}
        isLoading={isLoading}
        error={error}
        leafColCount={leafColCount}
        emptyLabel={emptyLabel}
      />
    </>
  );
}
