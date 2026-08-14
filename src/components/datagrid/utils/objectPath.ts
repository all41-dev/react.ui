/**
 * Dotted-path access for accessor keys.
 *
 * An `accessorKey` may address a nested field (`"user.name"`), and react-hook-form reads
 * a field name the same way. A flat `draft["user.name"]` would be a key the form never
 * looks at, so every read and write of a form value goes through these.
 */

/**
 * Dotted paths to the leaves of a nested tree.
 *
 * react-hook-form nests by field path — `accessorKey: "user.name"` becomes
 * `{ user: { name: … } }` in both `errors` and `dirtyFields` — while the grid keys
 * everything by the accessor key itself. Anything comparing the two has to flatten first,
 * or `"user"` reads as a field of its own.
 *
 * `isLeaf` decides where to stop descending (an error node carrying a `message`, a
 * `dirtyFields` node that is `true`). `skip` prunes a whole subtree by path.
 */
export function flattenPaths(
  tree: unknown,
  opts: { isLeaf: (node: unknown) => boolean; skip?: (path: string) => boolean },
  prefix = ""
): string[] {
  if (!tree || typeof tree !== "object") return [];
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (opts.skip?.(path)) return [];
    if (opts.isLeaf(value)) return [path];
    return flattenPaths(value, opts, path);
  });
}

export function getPath(obj: unknown, path: string): unknown {
  if (!path.includes(".")) {
    return (obj as Record<string, unknown> | undefined | null)?.[path];
  }
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/**
 * Writes `value` at `path`, creating missing levels. Intermediate containers are copied
 * rather than written through: the target is typically a shallow copy of a row and must
 * not mutate the nested objects it still shares with it. An existing array stays an
 * array, and an all-digit segment creates one.
 */
export function setPath(
  target: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  if (!path.includes(".")) {
    target[path] = value;
    return;
  }
  const segs = path.split(".");
  let cur = target;
  for (const [i, seg] of segs.slice(0, -1).entries()) {
    const next = cur[seg];
    if (Array.isArray(next)) {
      cur[seg] = [...next];
    } else if (next && typeof next === "object") {
      cur[seg] = { ...(next as Record<string, unknown>) };
    } else {
      /* Nothing there yet: an all-digit NEXT segment addresses an array index, so the
         level has to be created as an array — a plain object would seed the form
         `{ tags: { 0: … } }` and a schema expecting an array would reject the submit. */
      cur[seg] = /^\d+$/.test(segs[i + 1]) ? [] : {};
    }
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1]] = value;
}
