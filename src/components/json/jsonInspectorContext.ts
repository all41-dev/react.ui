import { createContext, useContext } from "react";
import type { JsonTarget } from "./jsonTarget";

/*
 * A .ts file, not .tsx: exporting a hook beside a component breaks
 * react-refresh. The provider lives in JsonInspectorProvider.tsx.
 */

export type JsonInspectorApi = {
  /** Opens the drawer on `target`; an open drawer swaps its content. */
  open: (target: JsonTarget) => void;
  close: () => void;
};

export const JsonInspectorContext = createContext<JsonInspectorApi | null>(null);

export function useJsonInspector(): JsonInspectorApi {
  const api = useContext(JsonInspectorContext);
  if (!api) {
    throw new Error("useJsonInspector must be used inside JsonInspectorProvider");
  }
  return api;
}
