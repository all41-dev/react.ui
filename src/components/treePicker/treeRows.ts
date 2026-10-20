import type { ReactNode } from "react";

/*
 * The rows a tree picker draws, from a flat parent-linked list. A row whose parent is
 * not in the list is a root. The component owns no data: a host sets every tag, tone
 * and state per row and reads the picks back.
 */

export type TreePickerKind = "leaf" | "object" | "array" | "group";
export type TreePickerTone = "accent" | "warning" | "info" | "danger" | "faint";
export type TreePickerRowState = "idle" | "armed" | "selected";

export type TreePickerRow = {
  id: string;
  /** `null` for a root; an id not in the list reads as a root too. */
  parentId: string | null;
  /**
   * `group` is a heading over its children: not picked, not a tab stop, counted for
   * no level. Its tag, state, dim and actions are ignored.
   */
  kind: TreePickerKind;
  name: string;
  /** Short text after the name. */
  tag?: string;
  tagTone?: TreePickerTone;
  /** Tone of the name itself. */
  tone?: TreePickerTone;
  /** A dot before the name, in a tone. */
  dot?: TreePickerTone;
  /** Faded, visually only; still picked, so the host can explain in the tag or title. */
  dim?: boolean;
  state?: TreePickerRowState;
  /** Native tooltip. */
  title?: string;
  /** Trailing controls, shown on hover and on the row that holds the tab stop. */
  actions?: ReactNode;
};

export type VisibleRow = {
  row: TreePickerRow;
  /** Indentation steps from the root, groups included. */
  depth: number;
  /** `aria-level`: groups count for none. */
  level: number;
  /** The nearest group heading above the row, or `null`. */
  groupId: string | null;
  /** `aria-posinset` / `aria-setsize` among the rows shown under the same parent. */
  index: number;
  siblingCount: number;
  /** Whether a chevron applies; false for every row under a query. */
  hasChildren: boolean;
  expanded: boolean;
};

/** Children by parent id, roots under `null`; an unknown parent counts as none. */
function childrenOf(rows: readonly TreePickerRow[]): Map<string | null, TreePickerRow[]> {
  const ids = new Set(rows.map((r) => r.id));
  const byParent = new Map<string | null, TreePickerRow[]>();
  for (const row of rows) {
    const parent = row.parentId !== null && ids.has(row.parentId) ? row.parentId : null;
    const list = byParent.get(parent);
    if (list) list.push(row);
    else byParent.set(parent, [row]);
  }
  return byParent;
}

/** Ids of every row that has children, groups left out: the initial expansion. */
export function containerIds(rows: readonly TreePickerRow[]): Set<string> {
  const groups = new Set(rows.filter((r) => r.kind === "group").map((r) => r.id));
  const out = new Set<string>();
  for (const key of childrenOf(rows).keys()) {
    if (key !== null && !groups.has(key)) out.add(key);
  }
  return out;
}

type Frame = { depth: number; level: number; groupId: string | null };

/**
 * The rows to draw, depth-first. Without a query: roots in list order, a container's
 * children under it while it is expanded. With a query (trimmed, case-insensitive on
 * the name): a row shows when its name matches or a descendant's does, a matching
 * container shows only its matching descendants, everything shown is open, and no row
 * reports children, since the query, not the expansion, decides what shows. A `group`
 * is a heading, not a container: its children always show and it reports none.
 */
export function visibleRows(
  rows: readonly TreePickerRow[],
  expanded: ReadonlySet<string>,
  query: string
): VisibleRow[] {
  const byParent = childrenOf(rows);
  const kidsOf = (id: string) => byParent.get(id) ?? [];
  const out: VisibleRow[] = [];
  const q = query.trim().toLowerCase();

  const memo = new Map<string, boolean>();
  const matches = (row: TreePickerRow): boolean => {
    const known = memo.get(row.id);
    if (known !== undefined) return known;
    // Set before the descent so a cycle in the links cannot loop.
    memo.set(row.id, false);
    const hit = row.name.toLowerCase().includes(q) || kidsOf(row.id).some(matches);
    memo.set(row.id, hit);
    return hit;
  };

  const walk = (parent: string | null, frame: Frame) => {
    const shown = (byParent.get(parent) ?? []).filter((row) => !q || matches(row));
    const siblings = shown.filter((row) => row.kind !== "group");
    for (const row of shown) {
      const group = row.kind === "group";
      const kids = kidsOf(row.id);
      const shownKids = q ? kids.filter(matches) : kids;
      const open = shownKids.length > 0 && (group || !!q || expanded.has(row.id));
      out.push({
        row,
        depth: frame.depth,
        level: group ? 0 : frame.level,
        groupId: frame.groupId,
        index: group ? 0 : siblings.indexOf(row) + 1,
        siblingCount: group ? 0 : siblings.length,
        hasChildren: kids.length > 0 && !group && !q,
        expanded: open,
      });
      if (open) {
        walk(row.id, {
          depth: frame.depth + 1,
          level: group ? frame.level : frame.level + 1,
          groupId: group ? row.id : frame.groupId,
        });
      }
    }
  };

  walk(null, { depth: 0, level: 1, groupId: null });
  return out;
}
