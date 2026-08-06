import type { Table } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, Columns3, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { ColumnMeta } from "../types/column";

/** Injected columns are structural — users reorder and hide their own columns only. */
const FIXED_IDS = new Set(["__select__", "__actions__"]);

const BTN =
  "inline-flex h-[30px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-control " +
  "border px-2.5 text-[.8125rem] outline-none transition-colors " +
  "focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]";

const BTN_OFF =
  "border-border-default bg-transparent text-muted hover:border-border-translucent hover:bg-surface-raised hover:text-body";

const BTN_ON =
  "border-[color-mix(in_srgb,var(--rui-accent)_50%,transparent)] bg-accent-subtle font-semibold text-accent";

const NUDGE =
  "grid h-5 w-5 place-items-center rounded border border-transparent text-faint transition-colors " +
  "hover:border-border-default hover:bg-surface-raised hover:text-body " +
  "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-transparent disabled:hover:bg-transparent " +
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]";

function labelFor(columnDef: { header?: unknown; meta?: unknown }, id: string) {
  const meta = columnDef.meta as ColumnMeta<any, any> | undefined;
  if (meta?.label) return meta.label;
  if (typeof columnDef.header === "string" && columnDef.header) {
    return columnDef.header;
  }
  return id;
}

/**
 * Column visibility and ordering.
 *
 * `useColumnPrefs` has always persisted `columnVisibility` and `columnOrder`, and
 * `DataGrid` has always fed them to TanStack — but nothing ever called the setters, so
 * the two were pure cost: a user could persist a layout with no way to change or reset
 * it. This is the missing UI.
 *
 * Reordering is up/down buttons rather than drag-and-drop: it needs no dependency, and
 * unlike a drag handle it works from the keyboard, which is the same standard the rest
 * of this grid's controls hold to.
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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const allColumns = table.getAllLeafColumns().filter((c) => !FIXED_IDS.has(c.id));
  // `getAllLeafColumns` is definition order; the popover has to show render order.
  const order = table.getState().columnOrder;
  const movable = order.filter((id) => !FIXED_IDS.has(id));
  const ordered = movable
    .map((id) => allColumns.find((c) => c.id === id))
    .filter((c): c is (typeof allColumns)[number] => !!c);
  const columns = ordered.length === allColumns.length ? ordered : allColumns;

  const visibleCount = columns.filter((c) => c.getIsVisible()).length;
  const hiddenCount = columns.length - visibleCount;

  /*
   * Swap within the movable subset, then stitch back into the full order at the same
   * slots — so `__select__` stays leading and `__actions__` stays trailing no matter
   * how the data columns are rearranged.
   */
  const move = (columnId: string, delta: -1 | 1) => {
    const from = movable.indexOf(columnId);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= movable.length) return;
    const swapped = [...movable];
    [swapped[from], swapped[to]] = [swapped[to], swapped[from]];
    let k = 0;
    table.setColumnOrder(order.map((id) => (FIXED_IDS.has(id) ? id : swapped[k++])));
  };

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
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[248px] rounded-surface border border-border-default bg-surface-card p-1.5 shadow-[var(--elev-3)] animate-pop-in"
        >
          <div className="max-h-[300px] overflow-y-auto scrollbar">
            {columns.map((col, i) => {
              const isVisible = col.getIsVisible();
              // Never let the user hide the last column standing — the grid would be an
              // empty rectangle with no way back except Reset layout.
              const lockedOn = isVisible && visibleCount === 1;
              const canHide = col.getCanHide() && !lockedOn;

              return (
                <div
                  key={col.id}
                  className="flex items-center gap-1.5 rounded-control px-1.5 py-1 transition-colors hover:bg-surface-inset"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      disabled={!canHide}
                      onChange={() => col.toggleVisibility()}
                      className="h-[13px] w-[13px] shrink-0 cursor-pointer accent-[var(--rui-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <span className="min-w-0 flex-1 truncate text-[.8125rem] text-body">
                      {labelFor(col.columnDef, col.id)}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => move(col.id, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${labelFor(col.columnDef, col.id)} earlier`}
                    className={NUDGE}
                  >
                    <ChevronUp className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(col.id, 1)}
                    disabled={i === columns.length - 1}
                    aria-label={`Move ${labelFor(col.columnDef, col.id)} later`}
                    className={NUDGE}
                  >
                    <ChevronDown className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-1 border-t border-border-default pt-1">
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
