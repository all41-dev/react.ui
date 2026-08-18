import { useMemo } from "react";

import type { WithMeta } from "../types/column";
import { filterFnFor } from "../utils/filterFns";
import { makeActionColumn } from "../ui/makeActionColumns";
import { makeSelectColumn } from "../ui/table/SelectionCells";
import { useColumnDefWarnings } from "./useColumnDefWarnings";
import { useColumnPrefs } from "./useColumnPrefs";
import { useForcedHiddenColumns } from "./useForcedHiddenColumns";

/**
 * The id TanStack Table will derive for a column def, reproduced exactly: explicit `id`,
 * else the accessor key with dots swapped for underscores, else a plain-string header.
 *
 * Not interchangeable with `getAccessorKey`. A column with `accessorKey: "user.name"` is
 * keyed `user_name` by the table and `user.name` by the form; substituting one for the
 * other silently unhooks visibility, ordering, cell editing and the form field.
 */
export const getColId = (c: {
  id?: string;
  accessorKey?: unknown;
  header?: unknown;
}): string => {
  if (c.id) return c.id;
  if (typeof c.accessorKey === "string" && c.accessorKey) {
    return c.accessorKey.replaceAll(".", "_");
  }
  return typeof c.header === "string" ? c.header : "";
};

type Params<TRow extends object, TForm extends object> = {
  columns: WithMeta<TRow, TForm>[];
  selectable: boolean;
  /** Whether an action column is worth rendering at all. */
  hasRowActions: boolean;
  storageKey: string;
};

/**
 * Assembles the final column list: the consumer's columns (with a real `filterFn`
 * attached per `meta.filter`), plus the injected select and action columns, ordered and
 * sized from persisted preferences.
 *
 * Every piece here depends only on the consumer's `columns` array and a handful of
 * primitives. The select and action columns carry no handlers — those arrive through
 * `DataGridContext` at cell-render time — which is what keeps the column model from
 * being rebuilt on every render and on every checkbox click.
 */
export function useGridColumns<TRow extends object, TForm extends object>({
  columns,
  selectable,
  hasRowActions,
  storageKey,
}: Params<TRow, TForm>) {
  /*
   * A column declaring `meta.filter` gets the matching filter function attached here.
   * Left to TanStack's `auto`, the fn is inferred from the first row's value type and
   * has no idea what shape the filter UI writes. An explicit `filterFn` on the column
   * always wins, so a consumer can still override.
   */
  const baseCols = useMemo(
    () =>
      columns
        .filter((c) => getColId(c) !== "__actions__")
        .map((c) => {
          const cfg = c.meta?.filter;
          if (!cfg || c.filterFn) return c;
          const fn = filterFnFor<TRow>(cfg);
          return fn ? { ...c, filterFn: fn } : c;
        }),
    [columns]
  );

  const actionCol = useMemo(
    () => (hasRowActions ? makeActionColumn<TRow>() : null),
    [hasRowActions]
  );

  const selectCol = useMemo(
    () => (selectable ? makeSelectColumn<TRow>() : null),
    [selectable]
  );

  const allColumnIds = useMemo(
    () => [
      ...(selectable ? ["__select__"] : []),
      ...baseCols.map(getColId),
      ...(hasRowActions ? ["__actions__"] : []),
    ],
    [baseCols, selectable, hasRowActions]
  );

  useColumnDefWarnings(baseCols, allColumnIds);

  /* Form-only columns: they carry an editor and a label but no place in the table. The
     injected select/action columns can never be one. */
  const defaultHiddenIds = useMemo(
    () =>
      baseCols
        .filter((c) => c.meta?.visibleInTable === false)
        .map(getColId),
    [baseCols]
  );

  const forceHiddenIds = useForcedHiddenColumns(baseCols, getColId);

  const { state, handlers, reset, isDefault } = useColumnPrefs(
    storageKey,
    allColumnIds,
    defaultHiddenIds,
    forceHiddenIds
  );

  const orderedColumns = useMemo(() => {
    const byId = new Map<string, WithMeta<TRow, TForm>>();
    for (const c of baseCols) byId.set(getColId(c), c);
    if (actionCol) byId.set("__actions__", actionCol as WithMeta<TRow, TForm>);
    if (selectCol) byId.set("__select__", selectCol as WithMeta<TRow, TForm>);
    return state.columnOrder
      .map((id) => byId.get(id))
      .filter(Boolean) as WithMeta<TRow, TForm>[];
  }, [baseCols, actionCol, selectCol, state.columnOrder]);

  return {
    baseCols,
    orderedColumns,
    prefs: state,
    prefHandlers: handlers,
    resetPrefs: reset,
    prefsAreDefault: isDefault,
    /** Hidden by the viewport, not by the user — the Columns popover leaves these out. */
    forceHiddenIds,
  };
}
