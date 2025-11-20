export function getRowKey<T>(r: T, idAccessor?: (r: T) => string | number | undefined) {
  return idAccessor?.(r) ?? (r as any)?.uuid;
}
