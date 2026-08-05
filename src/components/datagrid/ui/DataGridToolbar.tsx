import { Plus, X } from "lucide-react";
import { memo, useState, useEffect } from "react";

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
  const [dismissed, setDismissed] = useState(false);

  // Reset dismiss state when a new/different error arrives
  useEffect(() => {
    if (error) setDismissed(false);
  }, [error]);

  const showError = error && !dismissed;

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border-default p-3 relative z-10">
        <h2 className="text-lg font-semibold text-body">{title}</h2>
        <div className="flex items-center gap-2">
          {toolbar}
          {editContainer !== "none" && (
            <button
              onClick={onAddClick}
              disabled={!!error}
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
            <span className="truncate">
              {typeof error === "string" ? error : error.message}
            </span>
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
                onClick={() => setDismissed(true)}
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
