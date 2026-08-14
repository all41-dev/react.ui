import { useMemo } from "react";
import type { FieldErrors } from "react-hook-form";

import type { WithMeta } from "../types/column";
import { getAccessorKey } from "../utils/getAccessorKey";
import { flattenPaths, getPath } from "../utils/objectPath";

/**
 * The one message the form shows above its fields.
 *
 * A server error wins. Otherwise this only reports validation failures on keys that have
 * no rendered field: those errors block the submit while nothing on screen turns red, so
 * without this the form silently refuses to save.
 */
export function useFormError<TRow extends object, TForm extends object>(
  errors: FieldErrors<TForm>,
  fields: WithMeta<TRow, TForm>[]
): string | undefined {
  return useMemo(() => {
    const serverMsg = errors.root?.server?.message;
    if (serverMsg) return serverMsg;
    if (Object.keys(errors).length === 0) return undefined;

    /*
     * Both sides on the same axis. The resolver nests error paths, so a field declared
     * `user.name` arrives as `{ user: { name: … } }` — comparing raw top-level keys made
     * `user` look like a field with nothing rendering it, and every nested field's own
     * inline error came with a second banner naming a field that does not exist.
     */
    const covered = new Set(
      fields.map((c) => getAccessorKey(c)).filter(Boolean) as string[]
    );
    const unrendered = flattenPaths(errors, {
      isLeaf: (node) => !!node && typeof node === "object" && "message" in node,
      // `root` is react-hook-form's own namespace (the server error above lives there).
      skip: (path) => path === "root" || covered.has(path),
    });
    if (unrendered.length === 0) return undefined;

    const firstKey = unrendered[0];
    const node = getPath(errors, firstKey) as { message?: string } | undefined;
    return `Validation error on '${firstKey}': ${node?.message || "Invalid value"}`;
  }, [errors, fields]);
}
