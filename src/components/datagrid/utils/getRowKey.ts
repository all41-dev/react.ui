let warnedMissingKey = false;

/**
 * The grid's single source of row identity — checkbox selection, local create/edit/delete
 * reconciliation and the `<tbody>` React key all read it.
 *
 * `id` comes before `uuid` in the chain because `idAccessor` is optional and most rows
 * are `{ id, … }`. Getting this wrong is quiet and nasty: everything downstream compares
 * `String(key)`, so if every row keys to "undefined" one checkbox checks them all and no
 * edit or delete ever matches its row.
 */
export function getRowKey<T>(r: T, idAccessor?: (r: T) => string | number | undefined) {
  const key =
    idAccessor?.(r) ?? (r as any)?.id ?? (r as any)?.uuid;

  // Statically replaced at build time, so the warning is dropped from the published bundle.
  if (key === undefined && !warnedMissingKey && import.meta.env.DEV) {
    warnedMissingKey = true;
    console.warn(
      "[DataGrid] Could not resolve a row key: the row has no `id` or `uuid`. " +
        "Pass `idAccessor` — without a stable key, selection, editing and deletion " +
        "cannot tell rows apart."
    );
  }

  return key;
}
