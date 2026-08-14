import { flexRender, type Header } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ColumnMeta } from "../../types/column";
import { Resizer } from "./Resizer";

function HeaderCellInner<TRow extends object>({
  h,
  renderedWidth,
}: {
  h: Header<TRow, unknown>;
  /** The width the column paints at — see `Resizer`. */
  renderedWidth: number;
}) {
  if (h.isPlaceholder) {
    return <th className="!w-0 !p-0 border-none" aria-hidden="true" />;
  }

  const m = (h.column.columnDef as { meta?: ColumnMeta<any, any> }).meta;
  const isActions = h.column.id === "__actions__";
  if (isActions) {
    /* A real column header, named but not painted. The body cell holds the Edit/Delete
       buttons, so this column is in the accessibility tree either way — an `aria-hidden`
       header just left it there unnamed and one short of `aria-colcount`. */
    return (
      <th scope="col" data-col-id="__actions__" className="!w-0 !p-0 border-none">
        <span className="sr-only">Actions</span>
      </th>
    );
  }
  if (h.column.id === "__select__") {
    return (
      <th
        scope="col"
        data-col-id="__select__"
        className="h-[34px] w-[36px] border-b border-border-default px-2.5 text-left align-middle"
      >
        {flexRender(h.column.columnDef.header, h.getContext())}
      </th>
    );
  }

  const sorted = h.column.getIsSorted();
  const canSort = h.column.getCanSort();
  const headerText =
    m?.label ??
    (typeof h.column.columnDef.header === "string"
      ? h.column.columnDef.header
      : h.column.id);

  return (
    <th
      scope="col"
      data-col-id={h.column.id}
      /* Screen readers announce the current sort direction, and "none" advertises that
         the column is sortable at all. */
      aria-sort={
        !canSort
          ? undefined
          : sorted === "asc"
            ? "ascending"
            : sorted === "desc"
              ? "descending"
              : "none"
      }
      /* An uppercase micro-label in the faint tone. Deliberately not body size or
         weight, which would read as a first data row rather than a header. */
      className={[
        "relative group/hd",
        "h-[34px] whitespace-nowrap border-b border-border-default px-3 select-none",
        "text-left align-middle text-[.6875rem] font-semibold uppercase tracking-[.05em] text-faint",
        canSort ? "cursor-pointer hover:text-muted" : "",
        m?.headerClassName ?? "",
      ].join(" ")}
    >
      <Resizer h={h} renderedWidth={renderedWidth} columnLabel={headerText} />
      <div className="relative flex items-center pr-2">
        {canSort ? (
          /*
           * Sorting was configured on the table but had no trigger in the header, so it
           * was unreachable from the UI (and aria-sort could never change). A button
           * keeps it keyboard-operable; TanStack's toggle cycles asc -> desc -> none.
           */
          <button
            type="button"
            onClick={h.column.getToggleSortingHandler()}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-[5px] text-left uppercase outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
          >
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {flexRender(h.column.columnDef.header, h.getContext())}
            </span>
            {sorted === "asc" && (
              <ChevronUp className="h-3 w-3 shrink-0 text-accent" aria-hidden />
            )}
            {sorted === "desc" && (
              <ChevronDown className="h-3 w-3 shrink-0 text-accent" aria-hidden />
            )}
          </button>
        ) : (
          <div className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {flexRender(h.column.columnDef.header, h.getContext())}
          </div>
        )}
      </div>
    </th>
  );
}

/*
 * Deliberately NOT memoized.
 *
 * The previous comparator asked `prev.h.column.getIsSorted()` and
 * `next.h.column.getIsSorted()` — but TanStack reuses the same header object across
 * renders, so both calls read the same live value, compared equal, and the cell never
 * re-rendered. Sort direction, aria-sort and the chevron were all frozen, and the
 * select-all checkbox needed a hand-written escape hatch for the same reason.
 *
 * A comparator cannot see state that lives on the table, and there are only a handful of
 * header cells, so memoizing them was never worth the correctness risk.
 */
export const HeaderCell = HeaderCellInner;
