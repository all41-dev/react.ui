import { ChevronDown } from "lucide-react";

import { selectClass, type FilterProps } from "./filterControls";

export function BooleanFilter<TRow extends object>({
  col,
  cfg,
  label,
}: FilterProps<TRow, "boolean">) {
  const raw = col.getFilterValue();
  const labels = { any: "Any", true: "Yes", false: "No", ...(cfg.labels ?? {}) };
  const val = raw === true ? "true" : raw === false ? "false" : "";

  return (
    <div className="relative">
      <select
        className={selectClass}
        aria-label={`Filter by ${label}`}
        value={val}
        onChange={(e) => {
          const v = e.target.value;
          col.setFilterValue(v === "" ? undefined : v === "true");
        }}
      >
        <option value="">{labels.any}</option>
        <option value="true">{labels.true}</option>
        <option value="false">{labels.false}</option>
      </select>

      <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-faint">
        <ChevronDown className="h-3 w-3" aria-hidden />
      </span>
    </div>
  );
}
