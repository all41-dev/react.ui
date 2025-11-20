import type { ColumnMeta } from "../../types/column";
import { useIsTruncated } from "../../hooks/useIsTruncated";
import { useDataGridContext } from "../../DataGridContext";

type Props<TRow extends object> = {
  meta?: ColumnMeta<TRow, any>;
  value: unknown;
  rendered: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

function toTooltipText(value: unknown): string {
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
  const { onMouseEnter, truncated } = useIsTruncated();
  const { tooltipId } = useDataGridContext();

  // Logic:
  // 1. If meta.tooltip is explicitly true -> always show
  // 2. If meta.tooltip is explicitly false -> never show
  // 3. Default -> show if truncated
  const shouldShow =
    meta?.tooltip === true ? true : meta?.tooltip === false ? false : truncated;

  const tooltipText =
    (meta?.tooltipContent &&
      meta.tooltipContent({ value, row: undefined as any })) ??
    toTooltipText(value);

  return (
    <span
      className={`${className} dg-cell-content truncate block w-full`}
      style={style}
      onMouseEnter={onMouseEnter}
      data-tooltip-id={shouldShow ? tooltipId : undefined}
      data-tooltip-content={shouldShow ? tooltipText : undefined}
    >
      {rendered}
    </span>
  );
}
