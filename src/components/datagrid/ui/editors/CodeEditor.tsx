import { useCallback, useEffect, useRef, useState } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { buildExtensions, formatDocument } from "./codeMirrorSetup";
import type {
  CodeCompletionSource,
  CodeDiagnosticSource,
  CodeEditorLanguage,
  CodeEditorMode,
} from "./codeEditorTypes";

export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: CodeEditorLanguage;
  /** Height preset. `inline` is one line with no chrome, for a cell popover. */
  mode?: CodeEditorMode;
  /** Visible lines before the editor scrolls. Defaults per mode. */
  rows?: number;
  placeholder?: string;
  readOnly?: boolean;
  /** Domain-specific suggestions. Receives the member path already parsed. */
  completions?: CodeCompletionSource;
  /** Domain-specific problems, merged with the parser's own syntax errors. */
  diagnostics?: CodeDiagnosticSource;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
};

const DEFAULT_ROWS: Record<CodeEditorMode, number> = {
  full: 24,
  modal: 10,
  small: 4,
  inline: 1,
};

/**
 * CodeMirror 6 editor with highlighting, find/replace, bracket matching, formatting and
 * linting. Language intelligence beyond syntax is injected: `completions` and
 * `diagnostics` are how a consumer teaches it about its own domain.
 */
export function CodeEditor({
  value,
  onChange,
  language = "text",
  mode = "modal",
  rows,
  placeholder,
  readOnly = false,
  completions,
  diagnostics,
  id,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  "aria-label": ariaLabel,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const [caret, setCaret] = useState({ ln: 1, col: 1 });
  const [lineCount, setLineCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  /*
   * Everything the extensions call is read through a ref. Extensions are compiled once
   * per view, so closing over the props directly would freeze the first render's
   * callbacks — a stale `onChange` silently drops every keystroke after a re-render.
   */
  const onChangeRef = useRef(onChange);
  const completionsRef = useRef(completions);
  const diagnosticsRef = useRef(diagnostics);
  const formatRef = useRef<() => void>(() => {});

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    completionsRef.current = completions;
  }, [completions]);
  useEffect(() => {
    diagnosticsRef.current = diagnostics;
  }, [diagnostics]);

  const isInline = mode === "inline";
  const visibleRows = rows ?? DEFAULT_ROWS[mode];

  const handleFormat = useCallback(() => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    setBusy(true);
    setFormatError(null);
    formatDocument(view, language)
      .catch((err: unknown) => {
        setFormatError(err instanceof Error ? err.message : "Could not format");
      })
      .finally(() => setBusy(false));
  }, [language, readOnly]);

  useEffect(() => {
    formatRef.current = handleFormat;
  }, [handleFormat]);

  const escapeRef = useRef<() => boolean>(() => false);
  useEffect(() => {
    escapeRef.current = () => {
      if (!expanded) return false;
      setExpanded(false);
      return true;
    };
  }, [expanded]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const state = EditorState.create({
      doc: value,
      extensions: buildExtensions({
        language,
        mode,
        readOnly,
        placeholder,
        contentAttributes: {
          ...(id ? { id } : {}),
          ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
          ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
          ...(ariaInvalid ? { "aria-invalid": "true" } : {}),
          ...(ariaRequired ? { "aria-required": "true" } : {}),
        },
        onChange: (next) => onChangeRef.current(next),
        onCaretChange: (ln, col) => setCaret({ ln, col }),
        onDocMetrics: (lines) => setLineCount(lines),
        getCompletionSource: () => completionsRef.current,
        getDiagnosticSource: () => diagnosticsRef.current,
        onFormat: () => formatRef.current(),
        onEscape: () => escapeRef.current(),
      }),
    });

    const view = new EditorView({ state, parent: host });
    viewRef.current = view;
    setLineCount(state.doc.lines);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The document is seeded once; later value changes are applied by the sync effect
    // below rather than by rebuilding the editor and losing the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    language,
    mode,
    readOnly,
    placeholder,
    isInline,
    visibleRows,
    id,
    ariaLabel,
    ariaDescribedBy,
    ariaInvalid,
    ariaRequired,
  ]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === (value ?? "")) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value ?? "" },
    });
  }, [value]);

  const canFormat = language === "javascript" || language === "json";

  if (isInline) {
    return (
      <div
        ref={hostRef}
        className={`overflow-hidden rounded-control border border-border-default bg-surface-inset focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--rui-focus-ring)] ${className ?? ""}`}
      />
    );
  }

  /*
   * Expanding swaps classes and the height variable, nothing else. The element order
   * below is fixed — React matches children by position, so a conditional wrapper would
   * reuse this div for the spacer and remount the editor, destroying the view. The
   * spacer and backdrop are always present and merely hidden.
   */
  const frame = expanded
    ? "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-surface border border-border-default bg-surface-inset shadow-[0_24px_60px_rgba(0,0,0,.35)]"
    : "flex flex-col overflow-hidden rounded-control border border-border-default bg-surface-inset focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--rui-focus-ring)]";

  return (
    <>
      {/* Holds the form's layout while the editor is lifted out of the flow. */}
      <div
        aria-hidden
        style={{
          display: expanded ? "block" : "none",
          height: `${Math.max(visibleRows, 2) * 20 + 60}px`,
        }}
      />
      <div
        aria-hidden
        className={expanded ? "fixed inset-0 z-40 bg-[rgba(0,0,0,.45)]" : "hidden"}
      />
      <div
      className={frame}
      style={
        {
          "--rui-code-max-h": expanded
            ? "100%"
            : `${Math.max(visibleRows, 2) * 20 + 18}px`,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-border-default bg-surface-card px-2 py-1">
        <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[.6875rem] font-semibold uppercase tracking-wide text-muted">
          {language}
        </span>
        <div className="flex items-center gap-2">
          {canFormat && !readOnly && (
            <button
              type="button"
              onClick={handleFormat}
              disabled={busy}
              title="Format (Shift+Alt+F)"
              className="cursor-pointer rounded px-1.5 py-0.5 text-[.6875rem] text-faint transition-colors hover:bg-surface-raised hover:text-body disabled:opacity-40"
            >
              {busy ? "Formatting…" : "Format"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            title={expanded ? "Collapse (Esc)" : "Expand to full screen"}
            aria-expanded={expanded}
            className="cursor-pointer rounded px-1.5 py-0.5 text-[.6875rem] text-faint transition-colors hover:bg-surface-raised hover:text-body"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          <span className="font-mono text-[.6875rem] text-faint">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>
      </div>

      <div ref={hostRef} className={`min-h-0 flex-1 ${className ?? ""}`} />

      <div className="flex items-center justify-between gap-3 border-t border-border-default bg-surface-card px-2 py-1 font-mono text-[.6875rem] text-faint">
        <span className="truncate text-danger">{formatError}</span>
        <span className="flex shrink-0 items-center gap-3">
          <span className="hidden sm:inline">Ctrl+Space suggestions · Ctrl+F find</span>
          <span>
            Ln {caret.ln}, Col {caret.col}
          </span>
        </span>
      </div>
      </div>
    </>
  );
}
