import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useId, useMemo } from "react";

import { getApiMessage } from "../../../api/errors";
import type { DataGridContextValue } from "../DataGridContext";
import type { ActionColumnOpts, ActionView } from "../ui/makeActionColumns";
import type { DataGridProps } from "../types/grid";
import type { useDataGridState } from "./useDataGridState";

/* Icons rather than words — a text button doesn't fit the 26px action control.
   Module scope so the elements aren't rebuilt every render. */
const DEFAULT_ACTION_LABELS = {
  edit: <Pencil className="h-4 w-4" aria-hidden />,
  delete: <Trash2 className="h-4 w-4" aria-hidden />,
};

/** The grid-wide context value and the toolbar's facet chips. */
export function useGridChrome<TRow extends object, TForm extends object>({
  props,
  state,
  activeView,
  getId,
}: {
  props: DataGridProps<TRow, TForm>;
  state: ReturnType<typeof useDataGridState<TRow, TForm>>;
  activeView: ActionView;
  getId: (row: TRow) => string | number | undefined;
}) {
  const { edit, filters, grouping, mutations } = state;
  const editContainer = props.editContainer ?? "right";

  const tooltipId = useId().replace(/:/g, "_");
  const canCellEdit = !!props.onPersist;

  /*
   * `actionColumnOptions` is typed Partial so consumers can pass it inline, which means a
   * new object every render. Spreading it and listing the object in the deps below would
   * rebuild `rowActions` — and with it the whole context value — on every render, which is
   * exactly what routing cell callbacks through context was meant to avoid. So the memo
   * keys on the fields, not the wrapper. (Members that are themselves inline — a fresh
   * `renderActions` arrow, a fresh `labels` literal — still churn; `AGENTS.md` asks
   * consumers to keep those stable.)
   */
  const {
    getId: overrideGetId,
    onEdit: overrideOnEdit,
    onDelete: overrideOnDelete,
    onError: overrideOnError,
    labels: overrideLabels,
    editAriaLabel,
    deleteAriaLabel,
    renderActions,
    presentation,
  } = props.actionColumnOptions ?? {};

  const rowActions = useMemo<ActionColumnOpts<TRow>>(
    () => ({
      getId: overrideGetId ?? getId,
      // With no container to open, an Edit button would do nothing visible.
      onEdit:
        overrideOnEdit ?? (editContainer !== "none" ? edit.startEdit : undefined),
      onDelete:
        overrideOnDelete ?? (props.onDelete ? mutations.handleDelete : undefined),
      onError:
        overrideOnError ??
        ((err: unknown) => toast.error(getApiMessage(err, "Delete failed"))),
      labels: overrideLabels ?? DEFAULT_ACTION_LABELS,
      editAriaLabel,
      deleteAriaLabel,
      renderActions,
      presentation,
    }),
    [
      getId,
      editContainer,
      edit.startEdit,
      props.onDelete,
      mutations.handleDelete,
      overrideGetId,
      overrideOnEdit,
      overrideOnDelete,
      overrideOnError,
      overrideLabels,
      editAriaLabel,
      deleteAriaLabel,
      renderActions,
      presentation,
    ]
  );

  /*
   * Cell callbacks travel by context rather than inside the column definitions, which
   * keeps `orderedColumns` stable so TanStack reuses its column model instead of
   * rebuilding it on every render and every checkbox click.
   */
  const contextValue = useMemo<DataGridContextValue>(
    () => ({
      tooltipId,
      canCellEdit,
      startCellEdit: mutations.startCellEditFromCell,
      getId: getId as (row: unknown) => string | number | undefined,
      rowActions: rowActions as ActionColumnOpts<unknown>,
      view: activeView,
    }),
    [
      tooltipId,
      canCellEdit,
      mutations.startCellEditFromCell,
      getId,
      rowActions,
      activeView,
    ]
  );

  /* Keyed on the stable pieces, not the `filters` object — that object is rebuilt every
     render, so depending on it meant the memo never hit and `DataGridToolbar`'s own memo
     was defeated by a fresh `facets` array each time. */
  const { buildFacetChips } = filters;
  const facetChips = useMemo(
    () => buildFacetChips(grouping.activeGroupOption, grouping.clearGroupBy),
    [buildFacetChips, grouping.activeGroupOption, grouping.clearGroupBy]
  );

  return { tooltipId, contextValue, facetChips };
}
