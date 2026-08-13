import { RefreshCw, RotateCcw } from "lucide-react";

import { MENU_ITEM } from "../toolbarStyles";

/**
 * The row below the rule in the overflow panel: what changes the view rather than the
 * query.
 */
export function MenuCommandsRow({
  columnsControl,
  onResetView,
  viewIsDefault,
  onRetry,
  onCommandRun,
  divided,
}: {
  columnsControl?: React.ReactNode;
  /** Puts the whole view back to its declared defaults. */
  onResetView?: () => void;
  /** Nothing to undo — the command stays in place, greyed, so it stays learnable. */
  viewIsDefault?: boolean;
  onRetry?: () => void | Promise<void>;
  /** Closes the panel — one-shot commands dismiss it, the Columns dialog does not. */
  onCommandRun: () => void;
  /** Set when a Filter or Group by section sits above, to draw the rule. */
  divided: boolean;
}) {
  if (!columnsControl && !onRetry && !onResetView) return null;

  return (
    <div
      className={[
        "flex items-center gap-1",
        divided ? "mt-1.5 border-t border-border-default pt-1.5" : "",
      ].join(" ")}
    >
      {/* Left as its own control: it opens a dialog rather than running a command, so the
          panel stays open behind it. Its panel is positioned from its own trigger rect,
          so this wrapper no longer has to fight the containing block to keep the popover
          off the rows underneath. */}
      {columnsControl && (
        <div
          /* The trigger hides its label under `sm`; in here it always has room. */
          className="min-w-0 flex-1 [&>div>button]:!h-auto [&>div>button]:w-full [&>div>button]:justify-start [&>div>button]:!border-transparent [&>div>button]:!bg-transparent [&>div>button]:!py-1.5 [&>div>button]:!font-normal [&>div>button]:!text-body [&>div>button:hover]:!bg-surface-inset [&>div>button>span:first-of-type]:!inline"
        >
          {columnsControl}
        </div>
      )}

      {onResetView && (
        <button
          type="button"
          disabled={viewIsDefault}
          title={
            viewIsDefault ? "The view is already at its defaults" : undefined
          }
          onClick={() => {
            onResetView();
            onCommandRun();
          }}
          className={`${MENU_ITEM} ${columnsControl ? "flex-1" : ""} disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent`}
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
          <span className="flex-1">Reset view</span>
        </button>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={() => {
            void onRetry();
            onCommandRun();
          }}
          className={`${MENU_ITEM} ${columnsControl ? "flex-1" : ""}`}
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
          <span className="flex-1">Refresh</span>
        </button>
      )}
    </div>
  );
}
