import type { ComponentProps } from "react";
import type { DataGridProps } from "../types/grid";
import type { useDataGridState } from "../hooks/useDataGridState";
import { ColumnsPopover } from "./ColumnsPopover";
import { DataGridToolbar } from "./DataGridToolbar";

/**
 * Unpacks the grid's props and state bundles into `DataGridToolbar`'s flat prop list —
 * pure wiring, so the toolbar itself stays a dumb, memoizable component.
 */
export function GridToolbarSection<TRow extends object, TForm extends object>({
  props,
  state,
  facets,
  view,
  onViewChange,
}: {
  props: DataGridProps<TRow, TForm>;
  state: ReturnType<typeof useDataGridState<TRow, TForm>>;
  facets: ComponentProps<typeof DataGridToolbar>["facets"];
  view?: "list" | "cards";
  onViewChange?: (v: "list" | "cards") => void;
}) {
  const { rows, edit, filters, grouping, table, gridColumns } = state;
  const { resetView, viewIsDefault } = state;

  return (
    <DataGridToolbar
      title={props.title ?? "Data"}
      subtitle={props.subtitle}
      count={rows.length}
      toolbar={props.toolbar}
      editContainer={props.editContainer ?? "right"}
      error={props.error ?? null}
      onAddClick={edit.startCreate}
      onRetry={props.onRetry}
      searchable={props.searchable ?? true}
      searchValue={filters.globalFilter}
      onSearchChange={filters.setGlobalFilter}
      hasFilterableColumns={filters.hasFilterableColumns}
      filtersShown={filters.showFilters}
      activeFilterCount={filters.columnFilters.length}
      onToggleFilters={filters.toggleFilters}
      onClearFilters={filters.clearAllFilters}
      columnsControl={
        <ColumnsPopover table={table} onReset={gridColumns.resetPrefs} />
      }
      onResetView={resetView}
      viewIsDefault={viewIsDefault}
      view={view}
      onViewChange={onViewChange}
      groupOptions={props.groupOptions}
      groupBy={grouping.groupBy}
      onGroupByChange={grouping.setGroupBy}
      facets={facets}
    />
  );
}
