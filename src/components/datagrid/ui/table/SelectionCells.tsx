import type { CellContext, ColumnDef, HeaderContext } from "@tanstack/react-table";
import { Check, Minus } from "lucide-react";
import { useContext, useEffect, useRef } from "react";

import { DataGridSelectionContext } from "../../DataGridContext";

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
        /* Translucent edge on the inset surface, so an unchecked box recedes instead
           of drawing a hard rule in every row. */
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

/*
 * TanStack renders `header` / `cell` through `flexRender`, which mounts a function as a
 * real component — so these can hold hooks, and the selection state can arrive by
 * context instead of being baked into the column def. Don't close over `selectedIds`
 * here: that makes a brand-new column array on every checkbox click, and a new column
 * array makes TanStack rebuild its entire column model.
 *
 * `row.id` is the grid's own key — the table is configured with `getRowId` — so these
 * cells never derive one of their own.
 */
function SelectAllHeader<TRow extends object>({
  table,
}: HeaderContext<TRow, unknown>) {
  const selection = useContext(DataGridSelectionContext);
  if (!selection) return null;

  /* Scoped to the rows actually on screen. Grouping renders the whole sorted set and
     hides the pager, so reading the page-sliced model there would select five rows out
     of the thirty in front of the user — and say so in the label. */
  const visibleIds = (
    selection.rendersAllRows
      ? table.getSortedRowModel().rows
      : table.getRowModel().rows
  ).map((r) => r.id);
  const selectedVisible = visibleIds.filter((id) => selection.selectedIds.has(id)).length;
  const all = visibleIds.length > 0 && selectedVisible === visibleIds.length;
  const some = selectedVisible > 0 && !all;
  const scope = selection.rendersAllRows ? "rows" : "rows on this page";

  return (
    <Checkbox
      checked={all}
      indeterminate={some}
      onChange={() => selection.setPage(visibleIds, !all)}
      label={`${all ? "Unselect" : "Select"} all ${scope}`}
    />
  );
}

function SelectRowCell<TRow extends object>({ row }: CellContext<TRow, unknown>) {
  const selection = useContext(DataGridSelectionContext);
  if (!selection) return null;

  const id = row.id;
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
