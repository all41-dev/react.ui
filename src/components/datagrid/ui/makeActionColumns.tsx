import type { ColumnDef, CellContext } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { type FC, type ReactNode, useContext, useState } from "react";

import { DataGridContext } from "../DataGridContext";

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

/** Small inline spinner for action buttons. */
function ActionSpinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}

/*
 * 26px, transparent until hover. These sit inside the floating pill, which already
 * supplies the surface and border — giving each button its own makes the pill read as
 * a toolbar.
 */
const btnBase =
  "inline-flex h-[26px] w-[26px] items-center justify-center rounded-control cursor-pointer " +
  "border border-transparent bg-transparent text-faint transition-colors " +
  "group-hover:text-muted hover:!bg-surface-raised hover:!border-border-default hover:!text-body " +
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const EMPTY_ACTIONS: ActionColumnOpts<any> = { getId: () => undefined };

/**
 * The handlers, labels and `renderActions` come from context rather than from a closure
 * captured when the column was built. Consumers pass `actionColumnOptions` inline, so
 * closing over it made this column — and therefore the whole column model — rebuild on
 * every single render of the grid.
 */
function useRowActions(): ActionColumnOpts<any> {
  const grid = useContext(DataGridContext);
  return grid?.rowActions ?? EMPTY_ACTIONS;
}

// Icons rather than words — a text button doesn't fit the 26px control. A caller
// passing `labels` still wins.
const EditButton: FC<{ row: any }> = ({ row }) => {
  const opts = useRowActions();
  return (
    <button
      type="button"
      aria-label={opts.editAriaLabel ?? "Edit"}
      title={typeof opts.labels?.edit === "string" ? opts.labels?.edit : "Edit"}
      className={btnBase}
      onClick={(e) => {
        e.stopPropagation();
        opts.onEdit?.(row);
      }}
    >
      {opts.labels?.edit ?? <Pencil className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
};

/** Delete button with loading state to prevent double-clicks and provide visual feedback. */
const DeleteButton: FC<{ row: any }> = ({ row }) => {
  const opts = useRowActions();
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <button
      type="button"
      aria-label={opts.deleteAriaLabel ?? "Delete"}
      title={
        typeof opts.labels?.delete === "string" ? opts.labels?.delete : "Delete"
      }
      className={`${btnBase} hover:!border-[color-mix(in_srgb,var(--rui-danger)_45%,transparent)] hover:!bg-[color-mix(in_srgb,var(--rui-danger)_12%,transparent)] hover:!text-danger`}
      disabled={isDeleting}
      onClick={async (e) => {
        e.stopPropagation();
        setIsDeleting(true);
        try {
          await opts.onDelete?.(row);
        } catch (err) {
          opts.onError?.(err);
        } finally {
          setIsDeleting(false);
        }
      }}
    >
      {isDeleting ? (
        <ActionSpinner />
      ) : (
        (opts.labels?.delete ?? <Trash2 className="h-3.5 w-3.5" aria-hidden />)
      )}
    </button>
  );
};

function ActionCell({ row, isOverlay }: { row: any; isOverlay: boolean }) {
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
