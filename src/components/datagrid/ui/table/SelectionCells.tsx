import type { CellContext, ColumnDef, HeaderContext } from "@tanstack/react-table";
import { Check, Minus } from "lucide-react";
import { useContext, useEffect, useRef } from "react";

import {
  DataGridContext,
  DataGridSelectionContext,
} from "../../DataGridContext";

/**
 * 15px custom checkbox per the design spec. A real <input type="checkbox"> underneath
 * (keyboard + screen-reader behavior for free), drawn with the token palette; the
 * glyphs surface via peer-checked / peer-indeterminate.
 */
function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  // `indeterminate` is a DOM property, not an attribute — it can only be set via JS.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="relative grid h-[15px] w-[15px] cursor-pointer place-items-center">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        /* `.og-cb` — 4px radius on the inset surface with a translucent edge, so an
           unchecked box recedes instead of drawing a hard rule in every row. */
        className="peer h-[15px] w-[15px] cursor-pointer appearance-none rounded border border-border-translucent bg-surface-inset transition-colors checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
      />
      <Check
        className="pointer-events-none absolute h-[11px] w-[11px] text-accent-contrast opacity-0 peer-checked:opacity-100"
        strokeWidth={3}
        aria-hidden
      />
      <Minus
        className="pointer-events-none absolute h-[11px] w-[11px] text-accent-contrast opacity-0 peer-indeterminate:opacity-100"
        strokeWidth={3}
        aria-hidden
      />
    </label>
  );
}

/**
 * TanStack renders `header` / `cell` through `flexRender`, which mounts a function as a
 * real component — so these can hold hooks, and the selection state can arrive by
 * context instead of being baked into the column def. That is the whole point: closing
 * over `selectedIds` meant a brand-new column array on every checkbox click, and a new
 * column array makes TanStack rebuild its entire column model.
 */
function useRowKey() {
  const grid = useContext(DataGridContext);
  return (r: { original: unknown; id: string }) =>
    String(grid?.getId(r.original) ?? r.id);
}

function SelectAllHeader<TRow extends object>({
  table,
}: HeaderContext<TRow, unknown>) {
  const selection = useContext(DataGridSelectionContext);
  const rowKey = useRowKey();
  if (!selection) return null;

  // The paginated row model — the header checkbox is page-scoped by design.
  const pageIds = table.getRowModel().rows.map(rowKey);
  const selectedOnPage = pageIds.filter((id) => selection.selectedIds.has(id)).length;
  const all = pageIds.length > 0 && selectedOnPage === pageIds.length;
  const some = selectedOnPage > 0 && !all;

  return (
    <Checkbox
      checked={all}
      indeterminate={some}
      onChange={() => selection.setPage(pageIds, !all)}
      label={all ? "Unselect all rows on this page" : "Select all rows on this page"}
    />
  );
}

function SelectRowCell<TRow extends object>({ row }: CellContext<TRow, unknown>) {
  const selection = useContext(DataGridSelectionContext);
  const rowKey = useRowKey();
  if (!selection) return null;

  const id = rowKey(row);
  return (
    <Checkbox
      checked={selection.selectedIds.has(id)}
      onChange={() => selection.toggleRow(id)}
      label="Select row"
    />
  );
}

/** Leading checkbox column. Page-scoped header checkbox with indeterminate state. */
export function makeSelectColumn<TRow extends object>(): ColumnDef<TRow, unknown> {
  return {
    id: "__select__",
    size: 36,
    minSize: 36,
    maxSize: 36,
    enableResizing: false,
    enableSorting: false,
    enableColumnFilter: false,
    enableGlobalFilter: false,
    header: SelectAllHeader,
    cell: SelectRowCell,
  };
}
