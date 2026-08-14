import { ChevronDown } from "lucide-react";

import type { SelectOption } from "../../../types/column";
import { inputClass, selectClass, type FilterProps } from "./filterControls";

function MultiSelectFilter<TRow extends object>({
  col,
  opts,
  label,
}: {
  col: FilterProps<TRow, "select">["col"];
  opts: SelectOption[];
  label: string;
}) {
  const raw = col.getFilterValue();
  const val = (Array.isArray(raw) ? raw : []) as string[];

  return (
    <div>
      <select
        multiple
        aria-label={`Filter by ${label}`}
        className={inputClass + " !h-auto"}
        value={val}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
          col.setFilterValue(selected.length ? selected : undefined);
        }}
        size={Math.min(5, Math.max(3, opts.length))}
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SelectFilter<TRow extends object>({
  col,
  cfg,
  label,
}: FilterProps<TRow, "select">) {
  const opts = cfg.options ?? ([] as SelectOption[]);

  if (cfg.multi) {
    return <MultiSelectFilter col={col} opts={opts} label={label} />;
  }

  const val = (col.getFilterValue() as string) ?? "";
  return (
    <div className="relative">
      <select
        className={selectClass}
        aria-label={`Filter by ${label}`}
        value={val}
        onChange={(e) => col.setFilterValue(e.target.value || undefined)}
      >
        <option value="">{cfg.placeholder ?? "Any"}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-faint">
        <ChevronDown className="h-3 w-3" aria-hidden />
      </span>
    </div>
  );
}
