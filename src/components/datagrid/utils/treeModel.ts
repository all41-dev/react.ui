import { getPath } from "./objectPath";

export type TreeModel<TRow> = {
  /** Rows with no usable parent, in input order. */
  roots: TRow[];
  /** Parent key → its children, in input order. Only parents have an entry. */
  childrenOf: Map<string, TRow[]>;
  /** Child key → parent key. Roots have no entry. */
  parentOf: Map<string, string>;
  has: (key: string) => boolean;
  /** Every key below `key`, parents before their children. */
  descendantsOf: (key: string) => string[];
  /** Every key above `key`, nearest first. */
  ancestorsOf: (key: string) => string[];
  /** Rows promoted to root because their parent id matches no row. */
  orphanCount: number;
  /** Rows promoted to root to break a parent cycle. */
  cycleCount: number;
};

/**
 * Nests flat, parent-linked rows. Ids are compared as text, the same way the grid
 * compares row keys, so a numeric `parentId` finds a string id and the reverse.
 *
 * A row whose parent is missing becomes a root. So does one row of every parent
 * cycle, which leaves the rest of the cycle hanging under it rather than unreachable.
 */
export function buildTree<TRow>(
  rows: TRow[],
  getKey: (row: TRow) => string,
  parentKey: string
): TreeModel<TRow> {
  const byKey = new Map<string, TRow>();
  for (const row of rows) byKey.set(getKey(row), row);

  const parentOf = new Map<string, string>();
  let orphanCount = 0;
  let cycleCount = 0;

  for (const row of rows) {
    const key = getKey(row);
    const raw = getPath(row, parentKey);
    if (raw === null || raw === undefined || raw === "") continue;
    const parent = String(raw);
    if (parent === key) cycleCount += 1;
    else if (!byKey.has(parent)) orphanCount += 1;
    else parentOf.set(key, parent);
  }

  /* A chain that never reaches a root is a cycle, or hangs below one. Walking up from
     such a row revisits a key: that key is on the cycle and is cut loose as a root. */
  const rooted = new Set<string>();
  for (const row of rows) {
    const path: string[] = [];
    const onPath = new Set<string>();
    let cur: string | undefined = getKey(row);
    while (cur !== undefined && !rooted.has(cur)) {
      if (onPath.has(cur)) {
        parentOf.delete(cur);
        cycleCount += 1;
        break;
      }
      onPath.add(cur);
      path.push(cur);
      cur = parentOf.get(cur);
    }
    for (const key of path) rooted.add(key);
  }

  const roots: TRow[] = [];
  const childrenOf = new Map<string, TRow[]>();
  const childKeysOf = new Map<string, string[]>();
  for (const row of rows) {
    const key = getKey(row);
    const parent = parentOf.get(key);
    if (parent === undefined) {
      roots.push(row);
      continue;
    }
    const siblings = childrenOf.get(parent);
    if (siblings) siblings.push(row);
    else childrenOf.set(parent, [row]);
    const siblingKeys = childKeysOf.get(parent);
    if (siblingKeys) siblingKeys.push(key);
    else childKeysOf.set(parent, [key]);
  }

  const descendantsOf = (key: string) => {
    const out: string[] = [];
    const visit = (k: string) => {
      for (const child of childKeysOf.get(k) ?? []) {
        out.push(child);
        visit(child);
      }
    };
    visit(key);
    return out;
  };

  const ancestorsOf = (key: string) => {
    const out: string[] = [];
    let cur = parentOf.get(key);
    while (cur !== undefined) {
      out.push(cur);
      cur = parentOf.get(cur);
    }
    return out;
  };

  return {
    roots,
    childrenOf,
    parentOf,
    has: (key) => byKey.has(key),
    descendantsOf,
    ancestorsOf,
    orphanCount,
    cycleCount,
  };
}
