import { Pencil, Trash2 } from "lucide-react";
import { type FC, useContext, useState } from "react";

import { DataGridContext } from "../DataGridContext";
import type { ActionColumnOpts } from "./makeActionColumns";

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

const EMPTY_ACTIONS: ActionColumnOpts<unknown> = { getId: () => undefined };

/**
 * The handlers, labels and `renderActions` come from context rather than from a closure
 * captured when the column was built. Consumers pass `actionColumnOptions` inline, so
 * closing over it made this column — and therefore the whole column model — rebuild on
 * every single render of the grid.
 */
export function useRowActions(): ActionColumnOpts<unknown> {
  const grid = useContext(DataGridContext);
  return grid?.rowActions ?? EMPTY_ACTIONS;
}

// Icons rather than words — a text button doesn't fit the 26px control. A caller
// passing `labels` still wins.
export const EditButton: FC<{ row: unknown }> = ({ row }) => {
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
export const DeleteButton: FC<{ row: unknown }> = ({ row }) => {
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
