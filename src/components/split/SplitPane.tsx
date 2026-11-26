import {
  Children,
  Fragment,
  isValidElement,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { readSplitSizes, writeSplitSizes } from "./splitRatio";

/*
 * Panes sharing one box through draggable dividers, one pane per child. A
 * size is a pane's share of the space the open panes divide, so a box that
 * grows keeps the proportions; each pane keeps a pixel minimum. A divider
 * moves the boundary between the two open panes around it and leaves the
 * others alone. It is a separator the keyboard can move; Enter and a
 * double-click put every pane back to its default.
 */

const STEP_PX = 16;
const BIG_STEP_PX = 64;
const DEFAULT_MIN_PX = 80;

export interface SplitPaneProps {
  /** "vertical" stacks the panes and the dividers move up and down. */
  direction?: "vertical" | "horizontal";
  /** One pane per child; a keyed child keeps its state through a reorder. */
  children: ReactNode;
  /** Each pane's share, in order. Equal shares by default. */
  defaultSizes?: readonly number[];
  /** Pixels a pane keeps, one for all or one per pane; a drag stops there. */
  mins?: number | readonly number[];
  /** localStorage key of the remembered shares; none keeps them in memory. */
  storageKey?: string;
  /** Controlled shares; the component then remembers nothing itself. */
  sizes?: readonly number[];
  onSizesChange?: (sizes: number[]) => void;
  /** Once per gesture, with the settled shares; `null` on a reset. */
  onSizesCommit?: (sizes: number[] | null) => void;
  /** The panes folded to their own content; a folded pane's divider goes. */
  collapsed?: readonly boolean[];
  /** A divider's hit area in pixels. */
  gap?: number;
  /** A separator's accessible name: one for all, or by the index of the pane before it. */
  label: string | ((index: number) => string);
  className?: string;
  /** Attributes for a pane's own box, by index. */
  paneProps?: (index: number) => HTMLAttributes<HTMLDivElement> | undefined;
}

const round = (value: number) => Math.round(value * 10000) / 10000;

const usable = (sizes: readonly number[] | undefined, count: number): sizes is readonly number[] =>
  sizes !== undefined &&
  sizes.length === count &&
  sizes.every((size) => Number.isFinite(size) && size >= 0) &&
  sizes.some((size) => size > 0);

export function SplitPane({
  direction = "vertical",
  children,
  defaultSizes,
  mins = DEFAULT_MIN_PX,
  storageKey,
  sizes: controlled,
  onSizesChange,
  onSizesCommit,
  collapsed,
  gap = 10,
  label,
  className = "",
  paneProps,
}: SplitPaneProps) {
  const panes = Children.toArray(children);
  const count = panes.length;
  const defaults = usable(defaultSizes, count) ? defaultSizes : panes.map(() => 1 / count);

  const [own, setOwn] = useState(() => readSplitSizes(storageKey, defaults));
  const [readKey, setReadKey] = useState(storageKey);
  if (readKey !== storageKey) {
    setReadKey(storageKey);
    setOwn(readSplitSizes(storageKey, defaults));
  }
  const sizes = usable(controlled, count) ? controlled : usable(own, count) ? own : defaults;

  const paneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const latest = useRef<number[]>([]);
  const drag = useRef<{ before: number; after: number; at: number; px: number; total: number; sizes: number[] } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const vertical = direction === "vertical";
  const minOf = (index: number) => (typeof mins === "number" ? mins : (mins[index] ?? DEFAULT_MIN_PX));
  const folded = (index: number) => collapsed?.[index] === true;
  const open = panes.flatMap((_, index) => (folded(index) ? [] : [index]));
  const openTotal = open.reduce((sum, index) => sum + sizes[index], 0);
  /** The open pane a divider after `index` resizes it against; none for a folded or a last one. */
  const partnerOf = (index: number) => (folded(index) ? undefined : open[open.indexOf(index) + 1]);

  const extent = (index: number) => {
    const rect = paneRefs.current[index]?.getBoundingClientRect();
    return rect ? (vertical ? rect.height : rect.width) : 0;
  };

  /**
   * The pair's shares with `px` of their `total` pixels to the first; within the
   * minimums, the second's kept in a box too small for both. A box that cannot
   * be measured has no minimums to keep, and `px` is then the first's part.
   */
  const resized = (from: readonly number[], before: number, after: number, px: number, total: number) => {
    const high = total - minOf(after);
    const low = Math.min(minOf(before), Math.max(0, high));
    const part =
      total > 0 ? Math.min(Math.max(high, low), Math.max(low, px)) / total : Math.min(1, Math.max(0, px));
    const pair = from[before] + from[after];
    const next = [...from];
    next[before] = round(pair * part);
    next[after] = round(pair - next[before]);
    return next;
  };

  const move = (next: number[]) => {
    latest.current = next;
    if (controlled === undefined) setOwn(next);
    onSizesChange?.(next);
  };

  const settle = () => {
    if (controlled === undefined) writeSplitSizes(storageKey, latest.current);
    onSizesCommit?.(latest.current);
  };

  const reset = () => {
    const next = [...defaults];
    latest.current = next;
    if (controlled === undefined) {
      setOwn(next);
      writeSplitSizes(storageKey, null);
    }
    onSizesChange?.(next);
    onSizesCommit?.(null);
  };

  const onPointerDown = (before: number, after: number) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const px = extent(before);
    drag.current = {
      before,
      after,
      at: vertical ? e.clientY : e.clientX,
      px,
      total: px + extent(after),
      sizes: [...sizes],
    };
    latest.current = [...sizes];
    setDragging(before);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    if (!from || from.total <= 0) return;
    const by = (vertical ? e.clientY : e.clientX) - from.at;
    move(resized(from.sizes, from.before, from.after, from.px + by, from.total));
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(null);
    settle();
  };

  const onKeyDown = (before: number, after: number) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      reset();
      return;
    }
    const px = extent(before);
    const total = px + extent(after);
    const step = e.shiftKey ? BIG_STEP_PX : STEP_PX;
    let to: number | null = null;
    if (e.key === (vertical ? "ArrowUp" : "ArrowLeft")) to = px - step;
    else if (e.key === (vertical ? "ArrowDown" : "ArrowRight")) to = px + step;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = Infinity;
    if (to === null) return;
    e.preventDefault();
    move(resized(sizes, before, after, to, total));
    settle();
  };

  const axis = vertical ? "flex-col" : "flex-row";

  return (
    <div className={`flex min-h-0 min-w-0 ${axis} ${dragging !== null ? "select-none" : ""} ${className}`}>
      {panes.map((pane, index) => {
        const extra = paneProps?.(index);
        const partner = partnerOf(index);
        return (
          <Fragment key={isValidElement(pane) && pane.key !== null ? pane.key : index}>
            <div
              {...extra}
              ref={(el) => {
                paneRefs.current[index] = el;
              }}
              data-split-pane={index}
              // A folded pane is a plain block, so a child sized by flex-grow takes its content's size instead of none.
              className={`min-h-0 min-w-0 ${folded(index) ? "block" : `flex ${axis}`} ${extra?.className ?? ""}`}
              style={
                folded(index)
                  ? { ...extra?.style, flex: "none" }
                  : {
                      ...extra?.style,
                      flex: `${round(sizes[index] / (openTotal || 1))} 1 0px`,
                      [vertical ? "minHeight" : "minWidth"]: minOf(index),
                    }
              }
            >
              {pane}
            </div>
            {index === count - 1 ? null : partner === undefined ? (
              /* The gap stays beside a folded pane, so two panes never touch. */
              <div aria-hidden="true" style={{ flex: `0 0 ${gap}px` }} />
            ) : (
              <div
                role="separator"
                aria-orientation={vertical ? "horizontal" : "vertical"}
                aria-label={typeof label === "string" ? label : label(index)}
                aria-valuenow={Math.round((sizes[index] / (sizes[index] + sizes[partner] || 1)) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                tabIndex={0}
                onPointerDown={onPointerDown(index, partner)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown(index, partner)}
                onDoubleClick={reset}
                style={{ flex: `0 0 ${gap}px` }}
                className={`group flex touch-none select-none items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] ${
                  vertical ? "cursor-row-resize" : "cursor-col-resize"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`rounded-full ${vertical ? "h-[3px] w-8" : "h-8 w-[3px]"} ${
                    dragging === index
                      ? "bg-accent"
                      : "bg-border-default opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  }`}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
