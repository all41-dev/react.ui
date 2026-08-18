import { useCallback, useState } from "react";

/**
 * Accordion mode keeps at most one row open; otherwise expansion is additive.
 * `collapseAll` is stable — the data hook takes it as a dependency, and a fresh
 * identity each render would restart the fetch effect on every render.
 */
export function useExpandedRows(accordion: boolean) {
  const [expandedRowIds, setExpandedRowIds] = useState<ReadonlySet<string | number>>(
    new Set()
  );

  const collapseAll = useCallback(() => setExpandedRowIds(new Set()), []);

  const toggle = useCallback(
    (id: string | number) =>
      setExpandedRowIds((prev) => {
        if (accordion) return prev.has(id) ? new Set() : new Set([id]);
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [accordion]
  );

  return { expandedRowIds, toggle, collapseAll };
}
