/**
 * Windowed page list: first, last, current ±1, with ellipsis filling the gaps.
 * Totals of 7 or fewer render every page.
 */
export function pageWindow(
  current: number,
  total: number
): (number | "ellipsis-l" | "ellipsis-r")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "ellipsis-l" | "ellipsis-r")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push(p < current ? "ellipsis-l" : "ellipsis-r");
    out.push(p);
    prev = p;
  }
  return out;
}
