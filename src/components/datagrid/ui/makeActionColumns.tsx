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
};

function ActionCell({ row }: { row: unknown }) {
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
  return <div className="flex items-center gap-0.75">{inner}</div>;
}

/**
 * The action column carries no handlers: everything per-cell arrives through
 * `DataGridContext`, which keeps this column def referentially stable across renders.
 */
export function makeActionColumn<T>(): ColumnDef<T> {
  return {
    id: "__actions__",
    header: "",
    /* The colgroup lays this column out at zero width and positions its cells against
       the row. The model size has to agree, or the table's own width arithmetic counts
       150px of a column that is never painted. */
    size: 0,
    minSize: 0,
    enableResizing: false,
    enableSorting: false,
    meta: { cellClassName: "!p-0 !w-0 overflow-visible" },
    cell: ({ row }: CellContext<T, unknown>) => <ActionCell row={row.original} />,
  };
}
