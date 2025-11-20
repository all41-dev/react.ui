export function toCssSize(v?: number | string): string | undefined {
  if (v == null) return undefined;
  return typeof v === "number" ? `${v}px` : v;
}

export function toTooltipText(value: unknown, max = 500): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.slice(0, max);
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleString?.() ?? value.toString();

  if (Array.isArray(value)) {
    const s = value.map((v) => toTooltipText(v, max)).join(", ");
    return s.slice(0, max);
  }

  const prefer = (value as any)?.label ?? (value as any)?.name ?? (value as any)?.title;
  if (typeof prefer === "string") return prefer.slice(0, max);

  try {
    const s = JSON.stringify(value);
    return (s ?? String(value)).slice(0, max);
  } catch {
    return String(value).slice(0, max);
  }
}
