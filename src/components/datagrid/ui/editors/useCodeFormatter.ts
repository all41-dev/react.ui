import { useState } from "react";
import type { RefObject } from "react";
import type { EditorView } from "@codemirror/view";
import { formatDocument } from "./codeFormat";
import type { CodeEditorLanguage } from "./codeEditorTypes";

/** Only these two have a parser; for anything else the Format button is hidden. */
export const canFormat = (language: CodeEditorLanguage) =>
  language === "javascript" || language === "json";

export function useCodeFormatter(opts: {
  viewRef: RefObject<EditorView | null>;
  language: CodeEditorLanguage;
  readOnly: boolean;
}) {
  const { viewRef, language, readOnly } = opts;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    const view = viewRef.current;
    // The button is disabled while busy, but Shift+Alt+F is not — without this the
    // shortcut can start a second run over the first.
    if (!view || readOnly || busy) return;
    setBusy(true);
    setError(null);
    formatDocument(view, language)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not format");
      })
      .finally(() => setBusy(false));
  };

  return { busy, error, run, clearError: () => setError(null) };
}
