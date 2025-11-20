import type { ColumnDef, CellContext } from "@tanstack/react-table";
import type { FC, ReactNode } from "react";

export type ActionColumnOpts<T> = {
  getId: (r: T) => string | number | undefined;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => Promise<void> | void;
  onError?: (err: unknown) => void;

  labels?: { edit?: ReactNode; delete?: ReactNode };
  editAriaLabel?: string;
  deleteAriaLabel?: string;

  renderActions?: (args: {
    row: T;
    id: string | number | undefined;
    defaults: {
      EditButton: FC<{ row: T }>;
      DeleteButton: FC<{ row: T }>;
    };
  }) => ReactNode;

  presentation?: "inline" | "overlay";
};

export function makeActionColumn<T>(opts: ActionColumnOpts<T>): ColumnDef<T> {
  const btnBase =
    "inline-flex h-8 w-8 items-center justify-center rounded cursor-pointer " +
    "bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors";

  const EditButton: FC<{ row: T }> = ({ row }) => (
    <button
      type="button"
      aria-label={opts.editAriaLabel ?? "Edit"}
      title={typeof opts.labels?.edit === "string" ? opts.labels?.edit : "Edit"}
      className={btnBase}
      onClick={(e) => { e.stopPropagation(); opts.onEdit?.(row); }}
    >
      {opts.labels?.edit ?? "Edit"}
    </button>
  );

  const DeleteButton: FC<{ row: T }> = ({ row }) => (
    <button
      type="button"
      aria-label={opts.deleteAriaLabel ?? "Delete"}
      title={typeof opts.labels?.delete === "string" ? opts.labels?.delete : "Delete"}
      className={`${btnBase} text-red-600 hover:text-red-700 hover:bg-red-50`}
      onClick={async (e) => {
        e.stopPropagation();
        try { await opts.onDelete?.(row); } catch (err) { opts.onError?.(err); }
      }}
    >
      {opts.labels?.delete ?? "Delete"}
    </button>
  );

  const isOverlay = (opts.presentation ?? "overlay") === "overlay";

  const content = ({ row }: CellContext<T, unknown>) => {
    const id = opts.getId(row.original);
    const inner = opts.renderActions
      ? opts.renderActions({ row: row.original, id, defaults: { EditButton, DeleteButton } })
      : (<>
           {opts.onEdit && <EditButton row={row.original} />}
           {opts.onDelete && <DeleteButton row={row.original} />}
         </>);

    if (isOverlay) {
      // Gmail-style: absolute positioned to the right edge of the row
      return (
        <div
          className="
            absolute top-0 right-0 h-full
            flex items-center gap-1
            transition-opacity duration-150
            pointer-events-none
            bg-inherit
          "
        >
          <div className="pointer-events-auto flex items-center gap-1 ">
            {inner}
          </div>
        </div>
      );
    }

    // inline variant
    return (
      <div className="flex items-center gap-2">
        {inner}
      </div>
    );
  };

  return {
    id: "__actions__",
    header: isOverlay ? "" : "Actions",
    enableSorting: false,
    meta: isOverlay
      ? {
          cellClassName: "!p-0 !w-0 overflow-visible",
          width: 0,
        }
      : { cellClassName: "px-3 py-2" },
    cell: content,
  };
}




