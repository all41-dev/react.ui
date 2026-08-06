import { flexRender, type Header } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ColumnMeta } from "../../types/column";

const KEYBOARD_RESIZE_STEP = 16;

function Resizer({
  getResizeHandler,
  canResize,
  title,
  columnLabel,
  size,
  onResize,
  onReset,
}: {
  getResizeHandler: () => any;
  canResize: boolean;
  title: string;
  columnLabel: string;
  size: number;
  onResize: (next: number) => void;
  onReset: () => void;
}) {
  if (!canResize) return null;
  const handler = getResizeHandler();
  return (
    <>
      <div
        aria-hidden
        className="absolute top-0 bottom-0 right-0 w-px pointer-events-none bg-surface-inset z-10"
      />
      {/*
       * Focusable so the column can be resized without a pointer: arrows step the width,
       * Home resets it. Previously mouse/touch only, which left keyboard users with no way
       * to reach a truncated column's content.
       */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={`Resize ${columnLabel} column`}
        aria-valuenow={Math.round(size)}
        onMouseDown={handler}
        onTouchStart={handler}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onResize(size - KEYBOARD_RESIZE_STEP);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            onResize(size + KEYBOARD_RESIZE_STEP);
          } else if (e.key === "Home") {
            e.preventDefault();
            onReset();
          }
        }}
        className="absolute top-0 bottom-0 right-0 w-2 cursor-col-resize select-none touch-none opacity-0 outline-none z-10 group-hover/hd:opacity-100 focus-visible:opacity-100 focus-visible:bg-accent"
        title={title}
      />
    </>
  );
}

function HeaderCellInner<TRow extends object>({
  h,
}: {
  h: Header<TRow, unknown>;
}) {
  if (h.isPlaceholder) {
    return <th className="!w-0 !p-0 border-none" aria-hidden="true" />;
  }

  const m = (h.column.columnDef as any).meta as
    | ColumnMeta<any, any>
    | undefined;
  const isActions = h.column.id === "__actions__";
  if (isActions) {
    return <th className="!w-0 !p-0 border-none" aria-hidden="true" />;
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

  const canResize = h.column.getCanResize();
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
        m?.hideOnMobile ? "hidden md:table-cell" : "",
        m?.headerClassName ?? "",
      ].join(" ")}
      onDoubleClick={() => h.column.resetSize()}
    >
      <Resizer
        canResize={canResize}
        getResizeHandler={h.getResizeHandler}
        title="Drag to resize. Arrow keys to adjust, Home to reset."
        columnLabel={headerText}
        size={h.column.getSize()}
        onResize={(next) =>
          h.getContext().table.setColumnSizing((prev: Record<string, number>) => ({
            ...prev,
            [h.column.id]: Math.max(
              h.column.columnDef.minSize ?? 40,
              Math.min(next, h.column.columnDef.maxSize ?? 1000)
            ),
          }))
        }
        onReset={() => h.column.resetSize()}
      />
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
