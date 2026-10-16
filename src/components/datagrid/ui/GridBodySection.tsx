import { useMemo, type ReactNode } from "react";

import { useLoadingIndicator } from "../../../hooks/useLoadingIndicator";
import type { useDataGridState } from "../hooks/useDataGridState";
import type { useGridView } from "../hooks/useGridView";
import type { DataGridProps } from "../types/grid";
import { EditInline } from "./containers/EditInline";
import { GridBody } from "./GridBody";
import { EditingRow, type EditingRowArgs } from "./table/EditingRow";

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

  /* Space for the skeleton is reserved as soon as `isLoading` is true; the bars and
     the scrim wait for the delay, so a fast answer never flashes them. */
  const loadingShown = useLoadingIndicator(!!props.isLoading, {
    delayMs: props.loadingDelayMs,
    minVisibleMs: props.loadingMinVisibleMs,
  });

  /* `expandedRowIds` is the consumer's, so it may hold numeric ids; the bodies compare
     against the grid's string keys. Normalising here accepts either. */
  const { expandedRowIds } = props;
  const expandedKeys = useMemo(
    () =>
      expandedRowIds && new Set([...expandedRowIds].map((id) => String(id))),
    [expandedRowIds]
  );

  const formOpen = edit.session.kind === "create" || edit.session.kind === "edit";

  /* The inline form renders INSIDE the table body, unlike the overlay containers, so it
     travels to `GridBody` as a node rather than living in `GridEditors`. */
  const inlineEditor =
    view.inlineEditing && formOpen ? (
      <EditInline<TRow, TForm>
        open
        mode={edit.formMode}
        row={edit.editingRow}
        rowKey={editingRowKey}
        seed={edit.createSeed}
        columns={props.columns}
        zodSchema={props.zodSchema}
        formLayout={props.formLayout}
        onCancel={edit.close}
        onSubmit={mutations.handleSubmit}
      />
    ) : undefined;

  /*
   * Row mode draws the session in the row's own cells, so the body calls back with the
   * row and the column model it has in hand. The key is the session's serial, not the
   * seed: a draft chained from Enter reuses the seed and must still start clean.
   */
  const { close } = edit;
  const { focusRow } = state;
  const renderEditingRow =
    view.rowEditing && formOpen
      ? (args: EditingRowArgs<TRow>) => (
          <EditingRow<TRow, TForm>
            key={`session-${edit.serial}`}
            row={args.row}
            leafCols={args.leafCols}
            node={args.node}
            ariaRowIndex={args.ariaRowIndex}
            seed={edit.createSeed}
            focusColumnId={edit.focusColumnId}
            refocusSignal={edit.refusals}
            columns={props.columns}
            zodSchema={props.zodSchema}
            onSubmit={mutations.handleSubmit}
            onDirtyChange={edit.setDirty}
            onCancel={() => {
              close();
              /* A cancelled edit hands focus back to its row; a dropped draft has none. */
              if (editingRowKey !== undefined) focusRow(editingRowKey);
            }}
          />
        )
      : undefined;

  const inBody = view.inlineEditing || view.rowEditing;
  const isCreating = inBody && edit.session.kind === "create";

  /* Row mode: the draft row's place in the body, by the parent the seed names. */
  const treeMode = state.tree.enabled;
  const { draftParentKey } = state;
  const draft = useMemo(
    () =>
      view.rowEditing && isCreating
        ? { parentKey: draftParentKey, tree: treeMode }
        : undefined,
    [view.rowEditing, isCreating, draftParentKey, treeMode]
  );

  return (
    <GridBody<TRow>
      table={state.table}
      label={props.title ?? "Data"}
      isLoading={!!props.isLoading}
      loadingShown={loadingShown}
      error={props.error ?? null}
      emptyLabel={props.emptyLabel}
      card={card}
      showCards={view.showCards}
      grouping={grouping}
      showFilters={filters.showFilters && filters.hasFilterableColumns}
      selectedRowIds={props.selectable ? selection.selectedIds : undefined}
      onRowClick={onRowClick ? view.handleRowClick : undefined}
      selectedRowId={view.selectedRowId}
      editingRowId={inBody ? editingRowKey : undefined}
      inlineEditor={inlineEditor}
      renderEditingRow={renderEditingRow}
      draft={draft}
      isCreating={isCreating}
      changedRowId={state.changedRowId}
      expandedRowIds={expandedKeys}
      renderExpandedRow={props.renderExpandedRow}
    />
  );
}
