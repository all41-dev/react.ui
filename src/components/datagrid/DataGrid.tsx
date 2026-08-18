import { useCallback } from "react";

import { DataGridContext, DataGridSelectionContext } from "./DataGridContext";
import { useDataGridState } from "./hooks/useDataGridState";
import { useGridChrome } from "./hooks/useGridChrome";
import { useGridHandle } from "./hooks/useGridHandle";
import { useGridView } from "./hooks/useGridView";
import type { DataGridProps } from "./types/grid";
import { GridBodySection } from "./ui/GridBodySection";
import { GridEditors } from "./ui/GridEditors";
import { GridFooter } from "./ui/GridFooter";
import { GridToolbarSection } from "./ui/GridToolbarSection";
import { GridTooltip } from "./ui/GridTooltip";
import { getRowKey, rowKeyOf } from "./utils/getRowKey";

export type { DataGridProps, DataGridHandle } from "./types/grid";

/**
 * Composition only â€” state lives in `useDataGridState`, the view/session logic in
 * `useGridView`, the context value and facet chips in `useGridChrome`, the props type
 * in `types/grid.ts`, and the rendered regions in `ui/`.
 */
export function DataGrid<TRow extends object, TForm extends object = TRow>(
  props: DataGridProps<TRow, TForm>
) {
  /* The ref is split off so the rest travels as one plain bag â€” the React Compiler
     refuses property reads on an object that also carries a ref. */
  const { ref, idAccessor, card, onRowClick, ...gridProps } = props;

  /*
   * Two layers of one rule. `getKey` is the grid's identity — the table's `getRowId`, so
   * every internal comparison is against a TanStack `row.id`. `getId` is the consumer's
   * declared id, `undefined` when there is none, and reaches only `renderActions`.
   */
  const getKey = useCallback((r: TRow) => rowKeyOf(r, idAccessor), [idAccessor]);
  const getId = useCallback(
    (r: TRow) => getRowKey(r, idAccessor),
    [idAccessor]
  );

  const state = useDataGridState<TRow, TForm>(gridProps, getKey);
  const { edit, selection, grouping, pagination, mutations } = state;

  const view = useGridView<TRow>({
    hasCard: !!card,
    defaultView: gridProps.defaultView ?? "list",
    editContainer: gridProps.editContainer ?? "right",
    grouped: !!grouping.groups,
    edit,
    getKey,
    onRowClick,
  });

  const chrome = useGridChrome<TRow, TForm>({
    props: gridProps,
    state,
    activeView: view.activeView,
    getId,
  });

  useGridHandle(ref, edit, selection.clear);

  /* The containers key the form remount on this; `edit.editingRow` alone is not enough
     for rows keyed by a custom `idAccessor` (no `id`/`uuid` for the fallback to find). */
  const editingRowKey = edit.editingRow ? getKey(edit.editingRow) : undefined;

  return (
    <DataGridContext.Provider value={chrome.contextValue}>
      <DataGridSelectionContext.Provider value={chrome.selectionContextValue}>
        <div
          /*
           * Keep `overflow-hidden`: without it the sticky header and footer paint over
           * the rounded corners. The font and colour are set here so the grid uses its
           * own tokens rather than inheriting the host page's type.
           */
          className={[
            "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-surface",
            "border border-border-default bg-surface-card shadow-[var(--elev-2)]",
            "font-sans text-[.8125rem] text-body",
            gridProps.className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <GridToolbarSection<TRow, TForm>
            props={gridProps}
            state={state}
            facets={chrome.facetChips}
            view={card ? view.view : undefined}
            onViewChange={card ? view.handleViewChange : undefined}
          />

          <GridBodySection<TRow, TForm>
            props={gridProps}
            state={state}
            view={view}
            card={card}
            onRowClick={onRowClick}
            editingRowKey={editingRowKey}
          />

          <GridFooter<TRow>
            table={state.table}
            paginationEnabled={pagination.enabled}
            pageSizeOptions={pagination.pageSizeOptions}
            showCards={view.showCards}
            grouped={!!grouping.groups}
            selectable={gridProps.selectable ?? false}
            selectedCount={selection.selectedIds.size}
            onClearSelection={selection.clear}
          />

          <GridEditors<TRow, TForm>
            effectiveContainer={view.effectiveContainer}
            inlineEditing={view.inlineEditing}
            edit={edit}
            editingRowKey={editingRowKey}
            columns={gridProps.columns}
            zodSchema={gridProps.zodSchema}
            formLayout={gridProps.formLayout}
            onSubmit={mutations.handleSubmit}
            cellEditColumn={mutations.cellEditColumn}
            onCellSave={mutations.handleCellSave}
          />

          {state.ConfirmDialog}
        </div>

        <GridTooltip id={chrome.tooltipId} />
      </DataGridSelectionContext.Provider>
    </DataGridContext.Provider>
  );
}
