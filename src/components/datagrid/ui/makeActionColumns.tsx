import type { ColumnDef, CellContext } from "@tanstack/react-table";
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
      className="h-4 w-4 animate-spin"
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
  const btnBase =
    "inline-flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded cursor-pointer " +
    "bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white";

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
      {opts.labels?.edit ?? "Edit"}
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
        className={`${btnBase} text-red-600 hover:text-red-700 hover:bg-red-50`}
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
        {isDeleting ? <ActionSpinner /> : (opts.labels?.delete ?? "Delete")}
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

    if (isOverlay) {
      return (
        <div
          className="
            static md:absolute top-0 right-0 h-full
            flex items-center gap-1
            transition-opacity duration-150
            pointer-events-none
            bg-inherit
            mt-2 md:mt-0 justify-end md:justify-start w-full md:w-auto
          "
        >
          <div className="pointer-events-auto flex items-center gap-1 ">
            {inner}
          </div>
        </div>
      );
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
