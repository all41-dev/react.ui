import type { Column, Row, Table } from "@tanstack/react-table";
import type { Virtualizer, VirtualItem } from "@tanstack/react-virtual";
import type { ReactNode } from "react";

import type { BodyItem } from "../../hooks/useVirtualRows";
import {
  CreatingEditorBody,
  EmptyBody,
  PaddingBody,
  SkeletonBody,
} from "./TableStateBodies";
import { VirtualRowList } from "./VirtualRowList";

type GridBodiesProps<TRow extends object> = {
  table: Table<TRow>;
  getId: (row: TRow) => string | number | undefined;
  isLoading: boolean;
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
  editingRowId?: string | number | undefined;
  inlineEditor?: ReactNode;
  isCreating?: boolean;
  selectedRowId?: string | number | undefined;
  selectedRowIds?: ReadonlySet<string>;
  onRowClick?: (row: TRow) => void;
  expandedRowIds?: ReadonlySet<string | number>;
  renderExpandedRow?: (row: Row<TRow>["original"]) => ReactNode;
  changedRowId?: string | number;
};

/** Every `<tbody>` under the head, in paint order: skeleton, create row, rows, states. */
export function GridBodies<TRow extends object>({
  table,
  getId,
  isLoading,
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
      <SkeletonBody table={table} isLoading={isLoading} cols={leafColCount} />

      {isCreating && inlineEditor && (
        <CreatingEditorBody leafColCount={leafColCount}>
          {inlineEditor}
        </CreatingEditorBody>
      )}

      <PaddingBody height={paddingTop} colSpan={leafColCount} />

      {/* Rows stay mounted while loading. Gating them on `!isLoading` blanked the body on
          every refresh — the skeleton above only covers the first load, when there is
          nothing to keep — so the grid collapsed to header height and snapped back when
          the data returned. GridBody's scrim is what says "loading"; the rows underneath
          stay put, which is what CardsView already does. */}
      <VirtualRowList
        items={items}
        virtualItems={virtualItems}
        measureElement={measureElement}
        getId={getId}
        leafCols={leafCols}
        rowIndexOffset={rowIndexOffset}
        collapsedGroups={collapsedGroups}
        onToggleGroup={onToggleGroup}
        editingRowId={editingRowId}
        inlineEditor={inlineEditor}
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
