import { Braces, Brackets, ChevronDown, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  containerIds,
  visibleRows,
  type TreePickerRow,
  type TreePickerTone,
  type VisibleRow,
} from "./treeRows";

/*
 * A compact tree list a host drives row by row. One tab stop, plus the actions of the
 * row that holds it: the arrows walk the visible rows, Right and Left open and close a
 * container, Enter and Space pick. A `group` row is a heading over its children, named
 * on each of them, never picked. The picker owns only its expansion and, when
 * uncontrolled, its query.
 */

export type TreePickerProps = {
  rows: readonly TreePickerRow[];
  /** A row's body was activated: click, Enter or Space. Never raised for a `group`. */
  onPick: (row: TreePickerRow) => void;
  /** Controlled expansion; uncontrolled with every container open when omitted. */
  expanded?: ReadonlySet<string>;
  onExpandedChange?: (next: Set<string>) => void;
  /** Controlled query; the box keeps its own when omitted. */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** `false` hides the search box. */
  search?: boolean;
  searchPlaceholder?: string;
  /** Accessible name of the tree; the search box is named after it. */
  label: string;
  /** Above the search box: a title line the host composes. */
  header?: ReactNode;
  /** Shown instead of the tree when `rows` is empty. */
  emptyLabel?: string;
  /** The list scrolls inside the host's height instead of growing. */
  fill?: boolean;
  className?: string;
};

const TONE_TEXT: Record<TreePickerTone, string> = {
  accent: "text-accent",
  warning: "text-warning",
  info: "text-info",
  danger: "text-danger",
  faint: "text-faint",
};

const TONE_BG: Record<TreePickerTone, string> = {
  accent: "bg-accent",
  warning: "bg-warning",
  info: "bg-info",
  danger: "bg-danger",
  faint: "bg-faint",
};

const INDENT_PX = 12;
const INDENT_BASE_PX = 8;

export function TreePicker({
  rows,
  onPick,
  expanded: expandedProp,
  onExpandedChange,
  query: queryProp,
  onQueryChange,
  search = true,
  searchPlaceholder = "Search…",
  label,
  header,
  emptyLabel = "Nothing to show",
  fill = false,
  className = "",
}: TreePickerProps) {
  // Uncontrolled expansion is kept as what was closed, so a container that arrives
  // after the first render opens like the rest.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [ownQuery, setOwnQuery] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const listRef = useRef<HTMLUListElement>(null);
  const lastIndex = useRef(0);
  const uid = useId();

  const query = queryProp ?? ownQuery;
  const controlled = expandedProp !== undefined;

  const expanded = useMemo<ReadonlySet<string>>(() => {
    if (controlled) return expandedProp;
    const open = containerIds(rows);
    for (const id of collapsed) open.delete(id);
    return open;
  }, [controlled, expandedProp, rows, collapsed]);

  const visible = useMemo(() => visibleRows(rows, expanded, query), [rows, expanded, query]);
  const focusable = useMemo(
    () => visible.filter((v) => v.row.kind !== "group"),
    [visible]
  );

  // The focused row, or the first one once the focused row is hidden or gone.
  const tabStopId =
    focusable.find((v) => v.row.id === focusedId)?.row.id ?? focusable[0]?.row.id ?? null;

  // The row that held focus has left the visible rows: the tab stop moves to its
  // nearest neighbour, and focus follows only when it was lost with the row.
  useEffect(() => {
    const at = focusable.findIndex((v) => v.row.id === focusedId);
    if (at >= 0) {
      lastIndex.current = at;
      return;
    }
    if (focusedId === null) return;
    const target = focusable[Math.min(lastIndex.current, focusable.length - 1)];
    if (!target) return;
    const active = document.activeElement;
    const lost = !active || active === document.body;
    setFocusedId(target.row.id);
    if (lost) itemRefs.current.get(target.row.id)?.focus();
  }, [focusable, focusedId]);

  const setExpanded = useCallback(
    (id: string, open: boolean) => {
      if (controlled) {
        const next = new Set(expandedProp);
        if (open) next.add(id);
        else next.delete(id);
        onExpandedChange?.(next);
        return;
      }
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (open) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [controlled, expandedProp, onExpandedChange]
  );

  const focusRow = useCallback((id: string) => {
    setFocusedId(id);
    itemRefs.current.get(id)?.focus();
  }, []);

  const onQuery = (value: string) => {
    if (queryProp === undefined) setOwnQuery(value);
    onQueryChange?.(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>, v: VisibleRow) => {
    const at = focusable.findIndex((x) => x.row.id === v.row.id);
    const go = (index: number) => {
      const target = focusable[Math.max(0, Math.min(focusable.length - 1, index))];
      if (target) focusRow(target.row.id);
    };
    switch (e.key) {
      case "ArrowDown":
        go(at + 1);
        break;
      case "ArrowUp":
        go(at - 1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(focusable.length - 1);
        break;
      case "ArrowRight":
        if (!v.hasChildren) return;
        if (v.expanded) go(at + 1);
        else setExpanded(v.row.id, true);
        break;
      case "ArrowLeft": {
        if (v.hasChildren && v.expanded) {
          setExpanded(v.row.id, false);
          break;
        }
        // Up to the nearest ancestor that is a tab stop; a group heading is skipped.
        let parent = v.row.parentId;
        while (parent !== null) {
          const found = focusable.find((x) => x.row.id === parent);
          if (found) {
            focusRow(found.row.id);
            break;
          }
          parent = rows.find((r) => r.id === parent)?.parentId ?? null;
        }
        break;
      }
      case "Enter":
      case " ":
        onPick(v.row);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation();
  const headingId = (groupId: string) => `${uid}-group-${groupId}`;

  return (
    <div className={`flex min-h-0 flex-col ${fill ? "h-full" : ""} ${className}`}>
      {header}
      {search && (
        <input
          type="search"
          aria-label={`Search ${label}`}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className="mb-1.5 h-7 flex-none rounded-control border border-border-default bg-surface-inset px-2 text-xs text-body outline-none placeholder:text-faint focus:border-accent"
        />
      )}
      {rows.length === 0 ? (
        <p className="m-0 px-2 py-3 text-xs text-muted">{emptyLabel}</p>
      ) : (
        <ul
          ref={listRef}
          role="tree"
          aria-label={label}
          className={`m-0 list-none p-0 ${fill ? "scrollbar min-h-0 flex-1 overflow-auto" : ""}`}
        >
          {visible.map((v) => {
            const { row } = v;
            if (row.kind === "group") {
              return (
                <li
                  key={row.id}
                  id={headingId(row.id)}
                  role="presentation"
                  data-id={row.id}
                  data-kind="group"
                  className="mt-2 px-2 pb-1 text-[.625rem] font-bold tracking-wider text-faint uppercase"
                  style={{ paddingLeft: INDENT_BASE_PX + v.depth * INDENT_PX }}
                >
                  {row.name}
                </li>
              );
            }
            const state = row.state ?? "idle";
            const isTabStop = row.id === tabStopId;
            // Actions are in the DOM only where they can be reached: the row under the
            // pointer and the row that holds the tab stop, so Tab never walks the rest.
            const showActions = !!row.actions && (hoveredId === row.id || isTabStop);
            return (
              <li
                key={row.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(row.id, el);
                  else itemRefs.current.delete(row.id);
                }}
                role="treeitem"
                aria-label={row.tag ? `${row.name}, ${row.tag}` : row.name}
                aria-level={v.level}
                aria-posinset={v.index}
                aria-setsize={v.siblingCount}
                aria-expanded={v.hasChildren ? v.expanded : undefined}
                aria-selected={state === "selected"}
                aria-describedby={v.groupId ? headingId(v.groupId) : undefined}
                tabIndex={isTabStop ? 0 : -1}
                title={row.title}
                data-id={row.id}
                data-kind={row.kind}
                data-state={state}
                data-dim={row.dim ? "true" : undefined}
                onClick={() => onPick(row)}
                onFocus={() => setFocusedId(row.id)}
                onKeyDown={(e) => onKeyDown(e, v)}
                onMouseEnter={() => setHoveredId(row.id)}
                onMouseLeave={() => setHoveredId((cur) => (cur === row.id ? null : cur))}
                style={{ paddingLeft: INDENT_BASE_PX + v.depth * INDENT_PX }}
                className={`group flex h-7 cursor-pointer items-center gap-1.5 rounded-control pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] ${
                  state === "selected"
                    ? "bg-accent-subtle"
                    : state === "armed"
                      ? "bg-accent-subtle shadow-[inset_2px_0_0_var(--rui-accent)]"
                      : "hover:bg-surface-raised"
                } ${row.dim ? "opacity-40" : ""}`}
              >
                {v.hasChildren ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`${v.expanded ? "Collapse" : "Expand"} ${row.name}`}
                    onClick={(e) => {
                      stop(e);
                      setExpanded(row.id, !v.expanded);
                    }}
                    className="grid h-4 w-4 flex-none cursor-pointer place-items-center rounded-sm border-0 bg-transparent p-0 text-faint hover:text-body"
                  >
                    {v.expanded ? (
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  <span className="h-4 w-4 flex-none" aria-hidden="true" />
                )}
                {row.kind === "object" && (
                  <Braces
                    className={`h-3 w-3 flex-none ${TONE_TEXT[row.tone ?? "warning"]}`}
                    aria-hidden="true"
                  />
                )}
                {row.kind === "array" && (
                  <Brackets
                    className={`h-3 w-3 flex-none ${TONE_TEXT[row.tone ?? "info"]}`}
                    aria-hidden="true"
                  />
                )}
                {row.kind === "leaf" && row.dot && (
                  <span
                    className={`h-1.5 w-1.5 flex-none rounded-full ${TONE_BG[row.dot]}`}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`min-w-0 truncate font-mono ${
                    row.kind === "leaf" ? "" : "font-semibold"
                  } ${row.tone ? TONE_TEXT[row.tone] : "text-body"}`}
                >
                  {row.name}
                </span>
                {row.tag && (
                  <span
                    className={`ml-auto flex-none truncate text-[.625rem] ${
                      row.tagTone ? TONE_TEXT[row.tagTone] : "text-faint"
                    }`}
                  >
                    {row.tag}
                  </span>
                )}
                {showActions && (
                  <span
                    onClick={stop}
                    onKeyDown={stop}
                    className={`flex flex-none items-center gap-1 ${row.tag ? "" : "ml-auto"} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}
                  >
                    {row.actions}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
