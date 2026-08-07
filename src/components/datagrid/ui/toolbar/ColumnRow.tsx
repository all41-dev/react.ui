import type { Column } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { ColumnMeta } from "../../types/column";

const NUDGE =
  "grid h-5 w-5 place-items-center rounded border border-transparent text-faint transition-colors " +
  "hover:border-border-default hover:bg-surface-raised hover:text-body " +
  "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent " +
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]";

export function columnLabel(
  columnDef: { header?: unknown; meta?: unknown },
  id: string
) {
  const meta = columnDef.meta as ColumnMeta<any, any> | undefined;
  if (meta?.label) return meta.label;
  if (typeof columnDef.header === "string" && columnDef.header) {
    return columnDef.header;
  }
  return id;
}

/**
 * One row of the Columns popover: a visibility checkbox and the two nudge buttons.
 *
 * Reordering is up/down buttons rather than drag-and-drop — no dependency, and unlike a
 * drag handle it works from the keyboard, which is the standard the rest of this grid's
 * controls hold to.
 */
export function ColumnRow<TRow extends object>({
  column,
  canHide,
  isFirst,
  isLast,
  onMove,
}: {
  column: Column<TRow, unknown>;
  /** False for the last column standing, and for columns the consumer pinned. */
  canHide: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (columnId: string, delta: -1 | 1) => void;
}) {
  const label = columnLabel(column.columnDef, column.id);

  return (
    <div className="flex items-center gap-1.5 rounded-control px-1.5 py-1 transition-colors hover:bg-surface-inset">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={column.getIsVisible()}
          disabled={!canHide}
          onChange={() => column.toggleVisibility()}
          className="h-[13px] w-[13px] shrink-0 cursor-pointer accent-[var(--rui-accent)] disabled:cursor-not-allowed disabled:opacity-40"
        />
        <span className="min-w-0 flex-1 truncate text-[.8125rem] text-body">
          {label}
        </span>
      </label>

      <button
        type="button"
        onClick={() => onMove(column.id, -1)}
        disabled={isFirst}
        aria-label={`Move ${label} earlier`}
        className={NUDGE}
      >
        <ChevronUp className="h-3 w-3" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onMove(column.id, 1)}
        disabled={isLast}
        aria-label={`Move ${label} later`}
        className={NUDGE}
      >
        <ChevronDown className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}
