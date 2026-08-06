import type { ColumnDef, CellContext } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { type FC, type ReactNode, useState } from "react";

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

export function makeActionColumn<T>(opts: ActionColumnOpts<T>): ColumnDef<T> {
  /*
   * `.og-act button` — 26px, transparent until hover. These live inside the floating
   * pill, which already supplies the surface and border; giving each button its own
   * made the pill read as a toolbar.
   */
  const btnBase =
    "inline-flex h-[26px] w-[26px] items-center justify-center rounded-control cursor-pointer " +
    "border border-transparent bg-transparent text-faint transition-colors " +
    "group-hover:text-muted hover:!bg-surface-raised hover:!border-border-default hover:!text-body " +
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] " +
    "disabled:opacity-50 disabled:cursor-not-allowed";

  // Icons, not words — the design specifies lucide pencil / trash-2, and word buttons
  // do not fit a 26px control. A caller passing `labels` still wins.
  const EditButton: FC<{ row: T }> = ({ row }) => (
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

  /** Delete button with loading state to prevent double-clicks and provide visual feedback. */
  const DeleteButtonWithState: FC<{ row: T }> = ({ row }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    return (
      <button
        type="button"
        aria-label={opts.deleteAriaLabel ?? "Delete"}
        title={
          typeof opts.labels?.delete === "string"
            ? opts.labels?.delete
            : "Delete"
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

  // Keep a stateless version for the renderActions defaults
  const DeleteButton: FC<{ row: T }> = DeleteButtonWithState;

  const isOverlay = (opts.presentation ?? "overlay") === "overlay";

  const content = ({ row }: CellContext<T, unknown>) => {
    const id = opts.getId(row.original);
    const inner = opts.renderActions ? (
      opts.renderActions({
        row: row.original,
        id,
        defaults: { EditButton, DeleteButton },
      })
    ) : (
      <>
        {opts.onEdit && <EditButton row={row.original} />}
        {opts.onDelete && <DeleteButtonWithState row={row.original} />}
      </>
    );

    /*
     * `.og-act` — just the row of buttons. Positioning and reveal belong to the
     * container: `ActionsOverlayCell` floats it against the row, `CardItem` drops it in
     * the footer. This used to carry its own `md:absolute top-0 right-0 h-full`, which
     * fought both of them.
     */
    if (isOverlay) {
      return <div className="flex items-center gap-[3px]">{inner}</div>;
    }

    return <div className="flex items-center gap-2">{inner}</div>;
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
