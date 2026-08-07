import type { Table } from "@tanstack/react-table";
import { Columns3, RotateCcw } from "lucide-react";
import { useId, useRef, useState } from "react";

import { useAnchoredPanel } from "../hooks/useAnchoredPanel";
import { useColumnOrdering } from "../hooks/useColumnOrdering";
import { useOutsideDismiss } from "../hooks/useOutsideDismiss";
import { ColumnRow } from "./toolbar/ColumnRow";
import { BTN, BTN_OFF, BTN_ON } from "./toolbarStyles";

const PANEL_WIDTH = 248;
/** The list caps at 300px plus the reset row — enough to pick a side to open on. */
const PANEL_EST_HEIGHT = 340;

/**
 * Column visibility and ordering.
 *
 * `useColumnPrefs` has always persisted `columnVisibility` and `columnOrder`, and
 * `DataGrid` has always fed them to TanStack — but nothing ever called the setters, so
 * the two were pure cost: a user could persist a layout with no way to change or reset
 * it. This is the missing UI.
 */
export function ColumnsPopover<TRow extends object>({
  table,
  onReset,
}: {
  table: Table<TRow>;
  /** Clears persisted sizing/order/visibility back to the column defaults. */
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const panelStyle = useAnchoredPanel(open, wrapRef, PANEL_WIDTH, PANEL_EST_HEIGHT);
  const { columns, visibleCount, hiddenCount, move } = useColumnOrdering(table);

  useOutsideDismiss(open, wrapRef, () => setOpen(false));

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        className={[BTN, hiddenCount > 0 || open ? BTN_ON : BTN_OFF].join(" ")}
      >
        <Columns3 className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Columns</span>
        {hiddenCount > 0 && (
          <span className="rounded-full bg-accent px-1.5 font-mono text-[.6875rem] font-semibold leading-4 text-accent-contrast">
            {hiddenCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Columns"
          /* Placed in viewport coordinates — see `useAnchoredPanel` for why it can't be
             absolute. Still a DOM child of the wrapper, so dismissal is unchanged. */
          style={panelStyle}
          /* A flex column, so when `useAnchoredPanel` caps the height on a short
             viewport it is the scrolling list that gives, not the Reset row. */
          className="z-50 flex w-[248px] flex-col rounded-surface border border-border-default bg-surface-card p-1.5 shadow-[var(--elev-3)] animate-pop-in"
        >
          <div className="min-h-0 max-h-[300px] overflow-y-auto scrollbar">
            {columns.map((col, i) => (
              <ColumnRow
                key={col.id}
                column={col}
                /* Never let the user hide the last column standing — the grid would be
                   an empty rectangle with no way back except Reset layout. */
                canHide={col.getCanHide() && !(col.getIsVisible() && visibleCount === 1)}
                isFirst={i === 0}
                isLast={i === columns.length - 1}
                onMove={move}
              />
            ))}
          </div>

          <div className="mt-1 shrink-0 border-t border-border-default pt-1">
            <button
              type="button"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-control px-1.5 py-1 text-[.75rem] text-muted transition-colors hover:bg-surface-inset hover:text-body outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reset layout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
