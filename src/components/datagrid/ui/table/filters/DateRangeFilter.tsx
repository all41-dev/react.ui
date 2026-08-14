import { inputClass, type FilterProps } from "./filterControls";

export function DateRangeFilter<TRow extends object>({
  col,
  cfg,
  label,
}: FilterProps<TRow, "dateRange">) {
  const v = (col.getFilterValue() as { from?: string; to?: string }) ?? {};

  const push = (next: { from?: string; to?: string }) => {
    if (!next.from && !next.to) col.setFilterValue(undefined);
    else col.setFilterValue(next);
  };

  return (
    <div className="flex gap-1">
      <input
        type="date"
        className={inputClass}
        aria-label={`Filter by ${label}, from`}
        placeholder={cfg.placeholders?.from ?? "From"}
        value={v.from ?? ""}
        onChange={(e) => push({ ...v, from: e.target.value || undefined })}
      />
      <input
        type="date"
        className={inputClass}
        aria-label={`Filter by ${label}, to`}
        placeholder={cfg.placeholders?.to ?? "To"}
        value={v.to ?? ""}
        onChange={(e) => push({ ...v, to: e.target.value || undefined })}
      />
    </div>
  );
}
