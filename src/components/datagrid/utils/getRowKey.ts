let warnedMissingKey = false;

/**
 * The grid's single source of row identity — checkbox selection, local create/edit/delete
 * reconciliation and the `<tbody>` React key all read it.
 *
 * `id` is in the chain because `idAccessor` is optional and the overwhelmingly common row
 * shape is `{ id, … }`. Falling straight through to `uuid` returned `undefined` for those
 * rows, and everything downstream compares `String(key)`: every row keyed to "undefined",
 * so one checkbox checked them all, and `sameRowId` never matched so edits and deletes
 * never reconciled (#B5). `EditFormBody`'s `getRowId` already used this same chain.
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
