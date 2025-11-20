import { Plus } from "lucide-react";
import { memo } from "react";

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
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b p-3 relative z-10">
        <h2 className="text-lg font-semibold">{title}</h2>
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
    bg-black text-white
    transition-all
    hover:bg-gray-900
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

      {error && (
        <div
          className="mx-3 mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate">
              {typeof error === "string" ? error : error.message}
            </span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="shrink-0 rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
});
