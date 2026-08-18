import { useMemo, type ReactNode } from "react";

import type { useDataGridState } from "../hooks/useDataGridState";
import type { useGridView } from "../hooks/useGridView";
import type { DataGridProps } from "../types/grid";
import { EditInline } from "./containers/EditInline";
import { GridBody } from "./GridBody";

/**
 * Unpacks the grid's props, state and view bundles into `GridBody`'s flat prop list —
 * pure wiring, the same role `GridToolbarSection` plays for the toolbar, so `DataGrid`
 * stays composition.
 */
export function GridBodySection<TRow extends object, TForm extends object>({
  props,
  state,
  view,
  card,
  onRowClick,
  editingRowKey,
}: {
  props: DataGridProps<TRow, TForm>;
  state: ReturnType<typeof useDataGridState<TRow, TForm>>;
  view: ReturnType<typeof useGridView<TRow>>;
  card?: (row: TRow) => ReactNode;
  onRowClick?: (row: TRow) => void;
  /** The grid's resolved identity for the row under edit — keys the form remount. */
  editingRowKey: string | undefined;
}) {
  const { edit, filters, grouping, mutations, selection } = state;

  /* `expandedRowIds` is the consumer's, so it may hold numeric ids; the bodies compare
     against the grid's string keys. Normalising here accepts either. */
  const { expandedRowIds } = props;
  const expandedKeys = useMemo(
    () =>
      expandedRowIds && new Set([...expandedRowIds].map((id) => String(id))),
    [expandedRowIds]
  );

  /* The inline form renders INSIDE the table body, unlike the overlay containers, so it
     travels to `GridBody` as a node rather than living in `GridEditors`. */
  const inlineEditor =
    view.inlineEditing &&
    edit.session.kind !== "idle" &&
    edit.session.kind !== "cell" ? (
      <EditInline<TRow, TForm>
        open
        mode={edit.formMode}
        row={edit.editingRow}
        rowKey={editingRowKey}
        columns={props.columns}
        zodSchema={props.zodSchema}
        formLayout={props.formLayout}
        onCancel={edit.close}
        onSubmit={mutations.handleSubmit}
      />
    ) : undefined;

  return (
    <GridBody<TRow>
      table={state.table}
      label={props.title ?? "Data"}
      isLoading={!!props.isLoading}
      error={props.error ?? null}
      emptyLabel={props.emptyLabel}
      card={card}
      showCards={view.showCards}
      grouping={grouping}
      showFilters={filters.showFilters && filters.hasFilterableColumns}
      selectedRowIds={props.selectable ? selection.selectedIds : undefined}
      onRowClick={onRowClick ? view.handleRowClick : undefined}
      selectedRowId={view.selectedRowId}
      editingRowId={view.inlineEditing ? editingRowKey : undefined}
      inlineEditor={inlineEditor}
      isCreating={view.inlineEditing && edit.session.kind === "create"}
      changedRowId={state.changedRowId}
      expandedRowIds={expandedKeys}
      renderExpandedRow={props.renderExpandedRow}
    />
  );
}
