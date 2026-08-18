let warnedMissingKey = false;

/**
 * The consumer's declared row id, or `undefined` when the row carries none.
 *
 * Public-facing only: the `id` handed to `renderActions`. Everything the grid compares
 * internally goes through `rowKeyOf`, which never returns `undefined`.
 *
 * `id` comes before `uuid` in the chain because `idAccessor` is optional and most rows
 * are `{ id, … }`.
 */
export function getRowKey<T>(
  r: T,
  idAccessor?: (r: T) => string | number | undefined
) {
  const record = r as Record<string, unknown> | null | undefined;
  const key = (idAccessor?.(r) ?? record?.id ?? record?.uuid) as
    | string
    | number
    | undefined;

  // Statically replaced at build time, so the warning is dropped from the published bundle.
  if (key === undefined && !warnedMissingKey && import.meta.env.DEV) {
    warnedMissingKey = true;
    console.warn(
      "[DataGrid] Could not resolve a row key: the row has no `id` or `uuid`. " +
        "Pass `idAccessor`. Without one the grid keys the row by object reference, so " +
        "selection survives paging and sorting but not a refetch, and " +
        "`expandedRowIds` cannot address the row at all."
    );
  }

  return key;
}

/*
 * Keys for rows the consumer gave no id, held against the row object itself.
 *
 * Deliberately not the row's index: an index is reused by a different row as soon as one
 * is deleted, which paints the wrong row as selected. A reference survives paging,
 * sorting and filtering, and a refetch that replaces the row objects drops the selection
 * — the same outcome the grid already documents for a dataset swap.
 */
const syntheticKeys = new WeakMap<object, string>();
let syntheticCount = 0;

/**
 * The grid's single row-identity rule, as the string every comparison downstream uses.
 * The table is configured with this as its `getRowId`, so a TanStack `row.id` and a
 * `rowKeyOf(row)` are always the same value.
 */
export function rowKeyOf<T>(
  r: T,
  idAccessor?: (r: T) => string | number | undefined
): string {
  const declared = getRowKey(r, idAccessor);
  if (declared !== undefined) return String(declared);
  if (r === null || typeof r !== "object") return String(r);

  const row = r as object;
  let key = syntheticKeys.get(row);
  if (key === undefined) {
    key = `__dg_row_${++syntheticCount}`;
    syntheticKeys.set(row, key);
  }
  return key;
}
