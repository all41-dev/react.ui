/* Machine values read as prose: a code, a timestamp, a span. */

/** `IN_PROGRESS` → `In progress`. */
export function humanizeCode(code: string): string {
  const words = code.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const UNITS: [limit: number, seconds: number, unit: Intl.RelativeTimeFormatUnit][] =
  [
    [60, 1, "second"],
    [3600, 60, "minute"],
    [86400, 3600, "hour"],
    [2592000, 86400, "day"],
    [31536000, 2592000, "month"],
    [Infinity, 31536000, "year"],
  ];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/*
 * Only an ISO date-time counts as a timestamp. `Date.parse` falls back to a
 * lenient parser that reads "cursor-4711" as the year 4711, and the columns this
 * formats also hold arbitrary cursors.
 */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/;

/**
 * A timestamp as elapsed time — "2 minutes ago". Returns null for anything that
 * is not a date, so a caller can fall back to the raw value.
 */
export function relativeTime(value: string, now = Date.now()): string | null {
  if (!ISO_DATE_TIME.test(value.trim())) return null;

  const at = Date.parse(value);
  if (Number.isNaN(at)) return null;

  const elapsed = (at - now) / 1000;
  const magnitude = Math.abs(elapsed);
  if (magnitude < 5) return "just now";

  const [, seconds, unit] = UNITS.find(([limit]) => magnitude < limit) ?? UNITS[5];
  return relative.format(Math.round(elapsed / seconds), unit);
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * A timestamp as `2026-10-16 13:07`, in local time. Null for anything that is
 * not a date, under the same rule as `relativeTime`.
 */
export function formatDateTime(value: string): string | null {
  if (!ISO_DATE_TIME.test(value.trim())) return null;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return null;
  return `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())} ${pad2(at.getHours())}:${pad2(at.getMinutes())}`;
}

const SPAN_UNITS: [seconds: number, singular: string][] = [
  [86400, "day"],
  [3600, "hour"],
  [60, "minute"],
  [1, "second"],
];

/**
 * A span in milliseconds as its two largest units — `3 days 2 hours`,
 * `4 minutes`, `under a second`. A negative or unreadable span reads as the
 * shortest one rather than as a negative count.
 */
export function humanizeDuration(ms: number): string {
  let left = Math.floor(Math.max(0, Number.isFinite(ms) ? ms : 0) / 1000);
  const parts: string[] = [];
  for (const [seconds, unit] of SPAN_UNITS) {
    const count = Math.floor(left / seconds);
    left -= count * seconds;
    if (count > 0) parts.push(`${count} ${unit}${count === 1 ? "" : "s"}`);
    // The second unit is the one right under the first; empty, it ends the span.
    else if (parts.length > 0) break;
    if (parts.length === 2) break;
  }
  return parts.length ? parts.join(" ") : "under a second";
}
