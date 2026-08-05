import { flexRender, type Header } from "@tanstack/react-table";
import type { ColumnMeta } from "../../types/column";

function Resizer({
  getResizeHandler,
  canResize,
  title,
}: {
  getResizeHandler: () => any;
  canResize: boolean;
  title: string;
}) {
  if (!canResize) return null;
  const handler = getResizeHandler();
  return (
    <>
      <div
        aria-hidden
        className="absolute top-0 bottom-0 right-0 w-px pointer-events-none bg-surface-inset z-10"
      />
      <div
        onMouseDown={handler}
        onTouchStart={handler}
        className="absolute top-0 bottom-0 right-0 w-2 cursor-col-resize select-none opacity-0 group-hover/hd:opacity-100 touch-none z-10"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        title={title}
      />
    </>
  );
}

import { memo } from "react";

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
        data-col-id="__select__"
        className="w-[36px] border-b px-2.5 py-2 text-left align-middle"
      >
        {flexRender(h.column.columnDef.header, h.getContext())}
      </th>
    );
  }

  const canResize = h.column.getCanResize();

  return (
    <th
      data-col-id={h.column.id}
      className={[
        "relative group/hd",
        "border-b text-left text-sm font-medium align-top",
        "px-3 py-2 select-none",
        m?.hideOnMobile ? "hidden md:table-cell" : "",
        m?.headerClassName ?? "",
      ].join(" ")}
      onDoubleClick={() => h.column.resetSize()}
    >
      <Resizer
        canResize={canResize}
        getResizeHandler={h.getResizeHandler}
        title="Drag to resize. Double-click to reset."
      />
      <div className="relative flex items-center pr-2">
        <div className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
          {flexRender(h.column.columnDef.header, h.getContext())}
        </div>
      </div>
    </th>
  );
}

export const HeaderCell = memo(HeaderCellInner, (prev, next) => {
  // The select-all checkbox derives its checked/indeterminate state from the CURRENT
  // page's rows, which this comparator cannot see — skipping its re-render leaves the
  // header checkbox acting on a stale page. Always re-render it; it's one checkbox.
  if (next.h.column.id === "__select__") return false;
  if (prev.h.id !== next.h.id) return false;
  if (prev.h.column.getSize() !== next.h.column.getSize()) return false;
  if (prev.h.column.getIsSorted() !== next.h.column.getIsSorted()) return false;
  // Filters no longer render inside the header cell (they live in the filter row),
  // so getFilterValue() changes don't need to bust this memo anymore.
  if (prev.h.column.columnDef !== next.h.column.columnDef) return false;
  return true;
}) as typeof HeaderCellInner;
