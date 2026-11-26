import { useCallback, useMemo, useState, type ReactNode } from "react";
import { JsonInspector } from "./JsonInspector";
import { JsonInspectorContext } from "./jsonInspectorContext";
import type { JsonTarget } from "./jsonTarget";

/**
 * Owns the one JSON drawer of the app. Mounted once near the root; any
 * `JsonButton` below it opens the drawer through `useJsonInspector`.
 */
export function JsonInspectorProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<JsonTarget | null>(null);
  const open = useCallback((next: JsonTarget) => setTarget(next), []);
  const close = useCallback(() => setTarget(null), []);
  const api = useMemo(() => ({ open, close }), [open, close]);

  return (
    <JsonInspectorContext value={api}>
      {children}
      {target && <JsonInspector {...target} onClose={close} />}
    </JsonInspectorContext>
  );
}
