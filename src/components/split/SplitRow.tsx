import { Fragment, useState, type ReactNode } from "react";
import { SplitPane } from "./SplitPane";
import { readSplitRatios, writeSplitRatios } from "./splitRatio";
import type { PaneOrder } from "./usePaneOrder";

/*
 * A row of named panes the user resizes and reorders: `SplitPane` over the
 * order of `usePaneOrder`. A share belongs to its pane, so a pane keeps its
 * width through a reorder. Each pane is a drop target showing where a
 * dragged pane would land; the host places a pane's grip, a button taking
 * `paneOrder.gripProps(id)`, inside that pane.
 */

export interface SplitRowProps<Id extends string> {
  /** The order, its drag and its keys: what `usePaneOrder` returned. */
  paneOrder: PaneOrder<Id>;
  panes: Record<Id, ReactNode>;
  /** Each pane's share of the row. Equal shares by default. */
  defaultSizes?: Record<Id, number>;
  /** Pixels a pane keeps, travelling with the pane. */
  mins?: Partial<Record<Id, number>>;
  /** localStorage key of the remembered shares; none keeps them in memory. */
  storageKey?: string;
  /** Controlled shares; the component then remembers nothing itself. */
  sizes?: Record<Id, number>;
  onSizesChange?: (sizes: Record<Id, number>) => void;
  /** Once per gesture, with the settled shares; `null` on a reset. */
  onSizesCommit?: (sizes: Record<Id, number> | null) => void;
  /** The panes folded to their own content. */
  collapsed?: Partial<Record<Id, boolean>>;
  /** A divider's hit area in pixels. */
  gap?: number;
  className?: string;
}

export function SplitRow<Id extends string>({
  paneOrder,
  panes,
  defaultSizes,
  mins,
  storageKey,
  sizes: controlled,
  onSizesChange,
  onSizesCommit,
  collapsed,
  gap,
  className,
}: SplitRowProps<Id>) {
  const { order, labels, dragging, edgeOf } = paneOrder;
  const defaults =
    defaultSizes ?? (Object.fromEntries(order.map((id) => [id, 1 / order.length])) as Record<Id, number>);
  const [own, setOwn] = useState(() => (storageKey ? readSplitRatios(storageKey, defaults) : defaults));
  const [readKey, setReadKey] = useState(storageKey);
  if (readKey !== storageKey) {
    setReadKey(storageKey);
    setOwn(storageKey ? readSplitRatios(storageKey, defaults) : defaults);
  }
  const sizes = controlled ?? own;
  const named = (list: readonly number[]) =>
    Object.fromEntries(order.map((id, index) => [id, list[index]])) as Record<Id, number>;

  return (
    <SplitPane
      direction="horizontal"
      className={className}
      gap={gap}
      label={(index) => `Resize ${labels[order[index]]}`}
      sizes={order.map((id) => sizes[id])}
      defaultSizes={order.map((id) => defaults[id])}
      mins={mins && order.map((id) => mins[id] ?? 80)}
      collapsed={collapsed && order.map((id) => collapsed[id] === true)}
      onSizesChange={(list) => {
        const next = named(list);
        if (controlled === undefined) setOwn(next);
        onSizesChange?.(next);
      }}
      onSizesCommit={(list) => {
        if (controlled === undefined && storageKey) {
          writeSplitRatios<Id>(storageKey, list === null ? {} : named(list));
        }
        onSizesCommit?.(list === null ? null : named(list));
      }}
      paneProps={(index) => {
        const id = order[index];
        return { ...paneOrder.paneProps(id), className: `relative ${dragging === id ? "opacity-60" : ""}` };
      }}
    >
      {order.map((id) => {
        const edge = edgeOf(id);
        return (
          <Fragment key={id}>
            {edge && (
              <span
                aria-hidden="true"
                data-split-edge={edge}
                className={`pointer-events-none absolute inset-y-1 z-10 w-0.5 rounded-full bg-accent ${
                  edge === "before" ? "left-0" : "right-0"
                }`}
              />
            )}
            {panes[id]}
          </Fragment>
        );
      })}
    </SplitPane>
  );
}
