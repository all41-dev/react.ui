import type { CellContext, ColumnDef, HeaderContext } from "@tanstack/react-table";
import { Check, Minus } from "lucide-react";
import { useEffect, useRef } from "react";

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

export type SelectColumnOpts<TRow extends object> = {
  getId: (r: TRow) => string | number | undefined;
  /** Ids stored as strings — row ids are compared as text everywhere in this grid. */
  selectedIds: ReadonlySet<string>;
  onToggleRow: (id: string) => void;
  /** Header checkbox: select or unselect the CURRENT PAGE's rows only. */
  onSetPage: (pageIds: string[], selected: boolean) => void;
};

/** Leading checkbox column. Page-scoped header checkbox with indeterminate state. */
export function makeSelectColumn<TRow extends object>(
  opts: SelectColumnOpts<TRow>
): ColumnDef<TRow, unknown> {
  const rowKey = (r: { original: TRow; id: string }) =>
    String(opts.getId(r.original) ?? r.id);

  return {
    id: "__select__",
    size: 36,
    minSize: 36,
    maxSize: 36,
    enableResizing: false,
    enableSorting: false,
    enableColumnFilter: false,
    enableGlobalFilter: false,
    header: ({ table }: HeaderContext<TRow, unknown>) => {
      // The paginated row model — the header checkbox is page-scoped by design.
      const pageIds = table.getRowModel().rows.map(rowKey);
      const selectedOnPage = pageIds.filter((id) => opts.selectedIds.has(id)).length;
      const all = pageIds.length > 0 && selectedOnPage === pageIds.length;
      const some = selectedOnPage > 0 && !all;
      return (
        <Checkbox
          checked={all}
          indeterminate={some}
          onChange={() => opts.onSetPage(pageIds, !all)}
          label={all ? "Unselect all rows on this page" : "Select all rows on this page"}
        />
      );
    },
    cell: ({ row }: CellContext<TRow, unknown>) => {
      const id = rowKey(row);
      return (
        <Checkbox
          checked={opts.selectedIds.has(id)}
          onChange={() => opts.onToggleRow(id)}
          label="Select row"
        />
      );
    },
  };
}
