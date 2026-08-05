import type { ColumnMeta } from "../../types/column";
import { useDataGridContext } from "../../DataGridContext";
import { useIsTruncated } from "../../hooks/useIsTruncated";

type Props<TRow extends object> = {
  meta?: ColumnMeta<TRow, any>;
  value: unknown;
  /** The row, so `tooltipContent` receives what its signature promises. */
  row?: TRow;
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

/**
 * Cell content, with a tooltip attached ONLY when the text is actually clipped.
 *
 * Truncation is measured on pointer-enter (see useIsTruncated), so the tooltip attributes
 * appear just before they could be needed rather than on every cell in the grid.
 * `meta.tooltip === true` forces a tooltip regardless of clipping.
 */
export function CellWithTooltip<TRow extends object>({
  meta,
  value,
  row,
  rendered,
  className = "",
  style,
}: Props<TRow>) {
  const { tooltipId } = useDataGridContext();
  const { ref, truncated, onMouseEnter } = useIsTruncated<HTMLSpanElement>();

  const cls = `${className} dg-cell-content truncate block w-full`;

  if (meta?.tooltip === false || value === null || value === undefined) {
    return (
      <span className={cls} style={style}>
        {rendered}
      </span>
    );
  }

  const tooltipText =
    (meta?.tooltipContent &&
      // Previously called with `row: undefined as any`, which crashed any consumer
      // whose tooltipContent read the row.
      row !== undefined &&
      meta.tooltipContent({ value, row })) ||
    toTooltipText(value);

  const show = tooltipText && (truncated || meta?.tooltip === true);

  return (
    <span
      ref={ref}
      onMouseEnter={onMouseEnter}
      className={cls}
      style={style}
      {...(show ? { "data-tooltip-id": tooltipId, "data-tooltip-content": tooltipText } : {})}
    >
      {rendered}
    </span>
  );
}
