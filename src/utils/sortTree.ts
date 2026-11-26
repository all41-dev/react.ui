/** Name order for people: case and accents ignored, digits as numbers (`item2` before `item10`). */
export const byName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });

/**
 * A flat tree again depth-first, each parent's children in name order. An item whose
 * parent is not in the list counts as a root.
 */
export function sortTree<T>(
  items: readonly T[],
  of: (item: T) => { id: string; parentId: string | null; name: string }
): T[] {
  const keys = new Map(items.map((item) => [item, of(item)]));
  const ids = new Set([...keys.values()].map((k) => k.id));
  const children = new Map<string | null, T[]>();
  for (const item of items) {
    const { parentId } = keys.get(item)!;
    const parent = parentId !== null && ids.has(parentId) ? parentId : null;
    const list = children.get(parent);
    if (list) list.push(item);
    else children.set(parent, [item]);
  }
  const out: T[] = [];
  const walk = (parent: string | null) => {
    const list = [...(children.get(parent) ?? [])].sort((a, b) => byName(keys.get(a)!.name, keys.get(b)!.name));
    for (const item of list) {
      out.push(item);
      walk(keys.get(item)!.id);
    }
  };
  walk(null);
  return out;
}
