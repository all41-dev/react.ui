/** Dates arrive as ISO strings; anything unparseable is shown as it came. */
export function formatDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60_000],
  ["month", 30 * 24 * 60 * 60_000],
  ["day", 24 * 60 * 60_000],
  ["hour", 60 * 60_000],
  ["minute", 60_000],
];

/** "6 minutes ago" for a stored timestamp. Empty for anything that will not parse. */
export function relativeDate(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return "";

  const diff = date.getTime() - Date.now();
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const [unit, ms] = UNITS.find(([, size]) => Math.abs(diff) >= size) ?? [
    "minute",
    60_000,
  ];
  return format.format(Math.round(diff / ms), unit);
}
