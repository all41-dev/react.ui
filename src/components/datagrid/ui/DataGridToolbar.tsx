import { Plus, X } from "lucide-react";
import { memo, useState } from "react";

type DataGridToolbarProps = {
  title: string;
  toolbar?: React.ReactNode;
  editContainer?: "right" | "bottom" | "modal" | "inline" | "none";
  error: string | Error | null;
  onAddClick: () => void;
  onRetry?: () => void | Promise<void>;
};

export const DataGridToolbar = memo(function DataGridToolbar({
  title,
  toolbar,
  editContainer = "right",
  error,
  onAddClick,
  onRetry,
}: DataGridToolbarProps) {
  /*
   * Dismissal is tracked by message rather than by a boolean reset from an effect.
   * Keying on the Error object's identity meant a parent that rebuilt its error on every
   * render un-dismissed the banner immediately; keying on the text means a genuinely new
   * error re-opens it and the same one stays closed. No effect needed.
   */
  const errorMessage =
    error == null ? null : typeof error === "string" ? error : error.message;
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null);
  const showError = errorMessage !== null && errorMessage !== dismissedMessage;

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border-default p-3 relative z-10">
        <h2 className="text-lg font-semibold text-body">{title}</h2>
        <div className="flex items-center gap-2">
          {toolbar}
          {editContainer !== "none" && (
            <button
              onClick={onAddClick}
              /* Tied to the visible banner, not to `error` — dismissing the banner used
                 to leave Add disabled forever. */
              disabled={showError}
              className="
    inline-flex items-center gap-2
    rounded-md px-3 py-2  
    text-sm font-medium
    bg-accent text-accent-contrast
    transition-all
    hover:bg-accent-hover
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed
    cursor-pointer select-none
    shadow-sm hover:shadow
  "
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          )}
        </div>
      </div>

      {showError && (
        <div
          className="mx-3 mt-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
          role="alert"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">{errorMessage}</span>
            <div className="flex items-center gap-1 shrink-0">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="rounded border border-danger/40 bg-surface-card px-2 py-1 text-xs font-medium text-danger hover:bg-danger/20"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => setDismissedMessage(errorMessage)}
                className="rounded p-1 text-danger hover:text-danger hover:bg-danger/20 transition-colors"
                aria-label="Dismiss error"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
