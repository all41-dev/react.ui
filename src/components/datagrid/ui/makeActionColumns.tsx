import type { ColumnDef, CellContext } from "@tanstack/react-table";
import { type FC, type ReactNode, useContext } from "react";

import { DataGridContext } from "../DataGridContext";
import { DeleteButton, EditButton, useRowActions } from "./actionButtons";

/** Which grid body the action cell is rendering into right now. */
export type ActionView = "list" | "cards" | "kanban";

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
    /*
     * A custom button is only as view-portable as the feature it drives — one that
     * targets a table-only render (row expansion in a popover-less layout, say) can
     * check this and hide or swap itself in cards/kanban.
     */
    view: ActionView;
  }) => ReactNode;

  presentation?: "inline" | "overlay";
};

export type ActionPresentation = NonNullable<ActionColumnOpts<never>["presentation"]>;

function ActionCell({ row, isOverlay }: { row: unknown; isOverlay: boolean }) {
  const opts = useRowActions();
  const view = useContext(DataGridContext)?.view ?? "list";
  const inner = opts.renderActions ? (
    opts.renderActions({
      row,
      id: opts.getId(row),
      defaults: { EditButton, DeleteButton },
      view,
    })
  ) : (
    <>
      {opts.onEdit && <EditButton row={row} />}
      {opts.onDelete && <DeleteButton row={row} />}
    </>
  );

  /*
   * Just the row of buttons — positioning and reveal belong to the container.
   * `ActionsOverlayCell` floats it against the row, `CardItem` drops it in the footer.
   */
  return (
    <div className={isOverlay ? "flex items-center gap-[3px]" : "flex items-center gap-2"}>
      {inner}
    </div>
  );
}

/**
 * Only `presentation` is a build-time decision — it changes the column's own shape
 * (header text and cell padding). Everything else is per-cell and arrives by context,
 * which keeps this column def referentially stable across renders.
 */
export function makeActionColumn<T>(
  presentation: ActionPresentation = "overlay"
): ColumnDef<T> {
  const isOverlay = presentation === "overlay";

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
    cell: ({ row }: CellContext<T, unknown>) => (
      <ActionCell row={row.original} isOverlay={isOverlay} />
    ),
  };
}
