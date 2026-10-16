import { useEffect, type RefObject } from "react";

/**
 * Hands focus to a row's first row-editable cell once a session has closed on it. The
 * cells are found by the keys the body writes (`data-row-key` on the row's tbody,
 * `data-row-editable` on the cell), so a row the virtualizer has not mounted is left
 * alone. Compared by `dataset`, not an attribute selector: a key is consumer data.
 */
export function useRowFocus(
  root: RefObject<HTMLElement | null>,
  request: { key: string } | undefined
) {
  useEffect(() => {
    if (!request || !root.current) return;
    for (const body of root.current.querySelectorAll<HTMLElement>("tbody[data-row-key]")) {
      if (body.dataset.rowKey !== request.key) continue;
      body.querySelector<HTMLElement>("[data-row-editable]")?.focus();
      return;
    }
  }, [root, request]);
}
