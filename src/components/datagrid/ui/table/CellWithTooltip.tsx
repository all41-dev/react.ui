import type { ColumnMeta } from "../../types/column";
import { useDataGridContext } from "../../DataGridContext";

type Props<TRow extends object> = {
  meta?: ColumnMeta<TRow, any>;
  value: unknown;
  rendered: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function toTooltipText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function CellWithTooltip<TRow extends object>({
  meta,
  value,
  rendered,
  className = "",
  style,
}: Props<TRow>) {
  const { tooltipId } = useDataGridContext();

  if (meta?.tooltip === false || value === null || value === undefined) {
    return (
      <span
        className={`${className} dg-cell-content truncate block w-full`}
        style={style}
      >
        {rendered}
      </span>
    );
  }

  const tooltipText =
    (meta?.tooltipContent &&
      meta.tooltipContent({ value, row: undefined as any })) ??
    toTooltipText(value);

  if (!tooltipText) {
    return (
      <span
        className={`${className} dg-cell-content truncate block w-full`}
        style={style}
      >
        {rendered}
      </span>
    );
  }

  return (
    <span
      className={`${className} dg-cell-content truncate block w-full`}
      style={style}
      data-tooltip-id={tooltipId}
      data-tooltip-content={tooltipText}
    >
      {rendered}
    </span>
  );
}
