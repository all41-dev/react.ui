import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { toSingleLine } from "./codeInline";
import { buildExtensions } from "./codeMirrorSetup";
import type {
  CodeCompletionSource,
  CodeDiagnosticSource,
  CodeEditorLanguage,
  CodeEditorMode,
} from "./codeEditorTypes";

export type UseCodeMirrorViewOpts = {
  /** Owned by the caller so sibling hooks (formatting) can reach the same view. */
  viewRef: RefObject<EditorView | null>;
  value: string;
  onChange: (value: string) => void;
  language: CodeEditorLanguage;
  mode: CodeEditorMode;
  readOnly: boolean;
  placeholder?: string;
  completions?: CodeCompletionSource;
  diagnostics?: CodeDiagnosticSource;
  /** Land on the contenteditable, which is the element assistive tech sees. */
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  onFormat: () => void;
};

/**
 * Owns the CodeMirror view: one build per configuration change, and everything else —
 * the document, the aria attributes, the callbacks — applied to the live view.
 */
export function useCodeMirrorView(opts: UseCodeMirrorViewOpts) {
  const { viewRef, value, mode, language, readOnly, placeholder } = opts;
  const { id, ariaLabel, ariaDescribedBy, ariaInvalid, ariaRequired } = opts;
  const hostRef = useRef<HTMLDivElement>(null);
  const [attributes] = useState(() => new Compartment());
  const [caret, setCaret] = useState({ ln: 1, col: 1 });
  const [lineCount, setLineCount] = useState(1);

  /*
   * Everything the extensions call is read through a ref. Extensions are compiled once
   * per view, so closing over the props directly would freeze the first render's
   * callbacks — a stale `onChange` silently drops every keystroke after a re-render.
   */
  const onChangeRef = useRef(opts.onChange);
  const completionsRef = useRef(opts.completions);
  const diagnosticsRef = useRef(opts.diagnostics);
  const formatRef = useRef(opts.onFormat);

  // Memoised because its identity is what decides whether the view is reconfigured.
  const contentAttributes = useMemo(
    () => ({
      ...(id ? { id } : {}),
      ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
      ...(ariaInvalid ? { "aria-invalid": "true" } : {}),
      ...(ariaRequired ? { "aria-required": "true" } : {}),
    }),
    [id, ariaLabel, ariaDescribedBy, ariaInvalid, ariaRequired]
  );
  const attributesRef = useRef(contentAttributes);

  useEffect(() => {
    onChangeRef.current = opts.onChange;
    completionsRef.current = opts.completions;
    diagnosticsRef.current = opts.diagnostics;
    formatRef.current = opts.onFormat;
  });

  // Declared before the build effect so a rebuild in the same commit reads fresh
  // attributes rather than reconfiguring a view that is about to be replaced.
  useEffect(() => {
    attributesRef.current = contentAttributes;
    viewRef.current?.dispatch({
      effects: attributes.reconfigure(
        EditorView.contentAttributes.of(contentAttributes)
      ),
    });
  }, [attributes, contentAttributes, viewRef]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const state = EditorState.create({
      // Inline mode rejects newlines by transaction filter, which the initial state
      // bypasses — a seeded newline has to be flattened here or it can never be removed.
      doc: mode === "inline" ? toSingleLine(value) : value,
      extensions: buildExtensions({
        language,
        mode,
        readOnly,
        placeholder,
        attributesCompartment: attributes,
        contentAttributes: attributesRef.current,
        onChange: (next) => onChangeRef.current(next),
        onCaretChange: (ln, col) => setCaret((prev) =>
          prev.ln === ln && prev.col === col ? prev : { ln, col }
        ),
        onDocMetrics: (lines) => setLineCount(lines),
        getCompletionSource: () => completionsRef.current,
        getDiagnosticSource: () => diagnosticsRef.current,
        onFormat: () => formatRef.current(),
      }),
    });

    const view = new EditorView({ state, parent: host });
    viewRef.current = view;
    setLineCount(state.doc.lines);
    // A fresh state starts at offset 0; without this the status bar keeps reporting the
    // position from before the rebuild until the selection next moves.
    setCaret({ ln: 1, col: 1 });

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The document is seeded once; later value changes are applied by the sync effect
    // below rather than by rebuilding the editor and losing the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributes, language, mode, readOnly, placeholder, viewRef]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    const next = mode === "inline" ? toSingleLine(value ?? "") : (value ?? "");
    if (current === next) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
  }, [mode, value, viewRef]);

  return { hostRef, caret, lineCount };
}
