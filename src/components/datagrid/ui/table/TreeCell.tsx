import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import type { TreeContextValue } from "../../DataGridContext";
import { getPath } from "../../utils/objectPath";

/** A row's place in the tree, as the row model reports it. */
export type TreeNodeState = {
  /** 0 for a root. */
  depth: number;
  hasChildren: boolean;
  isOpen: boolean;
};

/** One level of indent. The chevron is as wide, so a guide runs under its centre. */
const INDENT_PX = 18;

const GUIDES =
  "linear-gradient(to right, transparent 8px, var(--rui-border-default) 8px, " +
  "var(--rui-border-default) 9px, transparent 9px)";

type TreeCellProps = {
  /** The grid's key for the row — what `setNodeOpen` addresses. */
  rowId: string;
  row: unknown;
  node: TreeNodeState;
  tree: TreeContextValue;
  /** The cell's value as text, for the chevron's accessible name. */
  label: string;
  children: ReactNode;
};

/**
 * The tree column's cell: indent with one guide line per ancestor, the chevron on a
 * parent and a spacer of the same width on a leaf, the level's icon and type tag, and
 * the column's own content between them.
 */
export function TreeCell({ rowId, row, node, tree, label, children }: TreeCellProps) {
  const { depth, hasChildren, isOpen } = node;
  const type = tree.typeKey ? getPath(row, tree.typeKey) : undefined;
  const level =
    type === undefined || type === null
      ? undefined
      : tree.levels?.find((l) => l.type === String(type));

  return (
    /* One pixel short of the 40px cell, whose bottom border takes the last one. */
    <div className="flex min-h-[39px] items-stretch">
      {depth > 0 && (
        <span
          aria-hidden
          /* Capped, so a deep node keeps room for its content; `aria-level` on the row
             still carries the real depth. */
          className="max-w-[calc(100%-6rem)] shrink-0"
          style={{
            width: depth * INDENT_PX,
            backgroundImage: GUIDES,
            backgroundSize: `${INDENT_PX}px 100%`,
          }}
        />
      )}

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {hasChildren ? (
          <button
            type="button"
            /* Not `disabled`: that takes the button out of the tab order, dropping focus
               when a search starts and hiding the title from a keyboard user. */
            aria-disabled={tree.locked || undefined}
            aria-label={`${isOpen ? "Collapse" : "Expand"} ${label}`}
            title={
              tree.locked ? "Open while a search or a filter is active" : undefined
            }
            onClick={(e) => {
              // The row's own click (select/expand) must not fire alongside the toggle.
              e.stopPropagation();
              if (!tree.locked) tree.setNodeOpen(rowId, !isOpen);
            }}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              // Kept from scrolling the table sideways.
              e.preventDefault();
              const open = e.key === "ArrowRight";
              if (!tree.locked && open !== isOpen) tree.setNodeOpen(rowId, open);
            }}
            /* The `before` box is the hit area, larger than the drawn one: a near miss
               on an 18px target would fire the row's click instead. */
            className="relative grid h-[18px] w-[18px] shrink-0 cursor-pointer place-items-center rounded-[4px] outline-none transition-colors before:absolute before:-inset-y-1.5 before:-left-1.5 before:-right-0.5 hover:bg-surface-inset focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] aria-disabled:cursor-default aria-disabled:hover:bg-transparent"
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-[transform,color] duration-150 ${
                isOpen ? "rotate-90 text-accent" : "text-faint"
              }`}
              aria-hidden
            />
          </button>
        ) : (
          <span aria-hidden className="w-[18px] shrink-0" />
        )}

        {level?.icon && (
          <span
            aria-hidden
            className="grid shrink-0 place-items-center text-muted"
            style={level.color ? { color: level.color } : undefined}
          >
            {level.icon}
          </span>
        )}

        <span className="min-w-0">{children}</span>

        {tree.showTypeTag && level && (
          <span
            className="shrink-0 text-[.625rem] font-semibold uppercase tracking-[.06em] text-faint"
            style={level.color ? { color: level.color } : undefined}
          >
            {level.label ?? level.type}
          </span>
        )}
      </div>
    </div>
  );
}
