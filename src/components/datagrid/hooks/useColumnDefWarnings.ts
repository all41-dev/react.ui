import { useEffect, useRef } from "react";

/**
 * Development-only checks on the consumer's column array. Both failures are silent in
 * production — a column that renders in the wrong place, or a whole column model rebuilt
 * every render — so the warning is the only thing that surfaces them.
 */
export function useColumnDefWarnings(
  baseCols: readonly unknown[],
  allColumnIds: readonly string[]
): void {
  const churn = useRef({ cols: baseCols, ids: "", count: 0, warned: false });
  const idsKey = allColumnIds.join("|");

  useEffect(() => {
    const c = churn.current;
    if (!import.meta.env.DEV || c.warned) return;
    // A render with a stable array breaks the streak — only churn on nearly every
    // render warns, not identity changes accumulated over a long session.
    if (baseCols !== c.cols && idsKey === c.ids) c.count += 1;
    else if (baseCols === c.cols) c.count = 0;
    c.cols = baseCols;
    c.ids = idsKey;
    if (c.count < 20) return;
    c.warned = true;
    console.warn(
      "[DataGrid] `columns` is a new array on nearly every render, so the whole column " +
        "model is rebuilt each time. Wrap the array in `useMemo`."
    );
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (allColumnIds.some((id) => !id)) {
      console.warn(
        "[DataGrid] A column resolves to no id. Give it an `id`, an `accessorKey`, or a " +
          "plain-string `header` — otherwise it cannot be ordered, hidden or cell-edited."
      );
    }
    const dupes = allColumnIds.filter((id, i) => allColumnIds.indexOf(id) !== i);
    if (dupes.length) {
      console.warn(
        `[DataGrid] Duplicate column ids: ${[...new Set(dupes)].join(", ")}. ` +
          "Only the last column of each id reaches the table; the others disappear."
      );
    }
  }, [allColumnIds]);
}
