import type { ColumnMeta } from "../../types/column";
import { useDataGridContext } from "../../DataGridContext";

type Props<TRow extends object> = {
  meta?: ColumnMeta<TRow, any>;
  value: unknown;
  /** The row, so `tooltipContent` receives what its signature promises. */
  row?: TRow;
  rendered: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Measured by the owning cell — the clipped element is the span rendered here. */
  contentRef?: React.Ref<HTMLSpanElement>;
  truncated?: boolean;
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
 * `truncated` is measured by the owning cell, which binds the measurement to hover and
 * focus on the whole `<td>`; that keeps one measurement per cell whether or not the
 * content sits inside a cell-edit button. `meta.tooltip === true` forces a tooltip
 * regardless of clipping.
 */
export function CellWithTooltip<TRow extends object>({
  meta,
  value,
  row,
  rendered,
  className = "",
  style,
  contentRef,
  truncated = false,
}: Props<TRow>) {
  const { tooltipId } = useDataGridContext();

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
      /* Guard the row: `tooltipContent`'s signature promises one, and a caller that has
         no row must not reach it. */
      row !== undefined &&
      meta.tooltipContent({ value, row })) ||
    toTooltipText(value);

  const show = tooltipText && (truncated || meta?.tooltip === true);

  return (
    <span
      ref={contentRef}
      className={cls}
      style={style}
      {...(show ? { "data-tooltip-id": tooltipId, "data-tooltip-content": tooltipText } : {})}
    >
      {rendered}
    </span>
  );
}
