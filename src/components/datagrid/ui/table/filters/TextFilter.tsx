import { useEffect, useState } from "react";

import { inputClass, type FilterProps } from "./filterControls";

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function TextFilter<TRow extends object>({
  col,
  cfg,
  label,
}: FilterProps<TRow, "text">) {
  const external = (col.getFilterValue() as string) ?? "";
  const [input, setInput] = useState(external);
  const [lastExternal, setLastExternal] = useState(external);
  const debounced = useDebounced(input, cfg.debounceMs ?? 250);

  // Reconcile an external change (e.g. "clear all filters") during render rather
  // than in an effect — see react.dev "adjusting state when a prop changes".
  if (external !== lastExternal) {
    setLastExternal(external);
    setInput(external);
  }

  /*
   * Two guards, both required. Writing back a value the column already holds still
   * counts as a filter change downstream — TanStack's auto-remove branch returns a fresh
   * array even when it removes nothing — which would send the grid to page 1 on every
   * mount of the filter row. And while `debounced` is still catching up to an input that
   * was just reset from outside, it holds the old term and would re-apply it.
   */
  useEffect(() => {
    if (debounced !== input || debounced === external) return;
    col.setFilterValue(debounced || undefined);
  }, [col, debounced, input, external]);

  return (
    <div>
      <input
        className={inputClass}
        aria-label={`Filter by ${label}`}
        placeholder={cfg.placeholder ?? "Filter…"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
    </div>
  );
}
