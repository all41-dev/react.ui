import {
  ChevronsDownUp,
  ChevronsUpDown,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import { useContext } from "react";

import { DataGridContext } from "../../DataGridContext";
import { MENU_ITEM } from "../toolbarStyles";
import { SectionHead } from "./MenuSections";

const DISABLED =
  "disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent";
const LOCKED_TITLE = "Every node is open while a search or a filter is active";
const ICON = "h-3.5 w-3.5 shrink-0 text-faint";

/**
 * The overflow panel's View section: what changes the view rather than the query. One
 * command per row, so the panel reads top to bottom like the Filter section above it.
 */
export function ViewSection({
  columnsControl,
  onResetView,
  viewIsDefault,
  onExpandAll,
  onCollapseAll,
  onRetry,
  onCommandRun,
  divided,
}: {
  /** The Columns popover in its menu presentation. Opens a dialog; the panel stays. */
  columnsControl?: React.ReactNode;
  /** Puts the whole view back to its declared defaults. */
  onResetView?: () => void;
  /** Nothing to undo — the command stays in place, greyed, so it stays learnable. */
  viewIsDefault?: boolean;
  /** Tree mode only: open or close every node. */
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onRetry?: () => void | Promise<void>;
  /** Closes the panel — one-shot commands dismiss it, the Columns dialog does not. */
  onCommandRun: () => void;
  /** Set when a Filter or Group by section sits above, to draw the rule. */
  divided: boolean;
}) {
  /* A search or a filter holds every node open. No context outside a grid, and no
     `tree` in a flat one: nothing is locked there. */
  const treeLocked = useContext(DataGridContext)?.tree?.locked ?? false;
  const hasTreeCommands = !!onExpandAll && !!onCollapseAll;
  const hasViewCommands = !!columnsControl || !!onRetry || !!onResetView;
  if (!hasTreeCommands && !hasViewCommands) return null;

  return (
    <section
      aria-label="View"
      className={divided ? "mt-1.5 border-t border-border-default pt-1.5" : ""}
    >
      <SectionHead Icon={SlidersHorizontal}>View</SectionHead>

      {hasTreeCommands && (
        <>
          <button
            type="button"
            disabled={treeLocked}
            title={treeLocked ? LOCKED_TITLE : undefined}
            onClick={() => {
              onExpandAll();
              onCommandRun();
            }}
            className={`${MENU_ITEM} ${DISABLED}`}
          >
            <ChevronsUpDown className={ICON} aria-hidden />
            <span className="flex-1">Expand all</span>
          </button>
          <button
            type="button"
            disabled={treeLocked}
            title={treeLocked ? LOCKED_TITLE : undefined}
            onClick={() => {
              onCollapseAll();
              onCommandRun();
            }}
            className={`${MENU_ITEM} ${DISABLED}`}
          >
            <ChevronsDownUp className={ICON} aria-hidden />
            <span className="flex-1">Collapse all</span>
          </button>
        </>
      )}

      {columnsControl}

      {onResetView && (
        <button
          type="button"
          disabled={viewIsDefault}
          title={viewIsDefault ? "The view is already at its defaults" : undefined}
          onClick={() => {
            onResetView();
            onCommandRun();
          }}
          className={`${MENU_ITEM} ${DISABLED}`}
        >
          <RotateCcw className={ICON} aria-hidden />
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
          className={MENU_ITEM}
        >
          <RefreshCw className={ICON} aria-hidden />
          <span className="flex-1">Refresh</span>
        </button>
      )}
    </section>
  );
}
