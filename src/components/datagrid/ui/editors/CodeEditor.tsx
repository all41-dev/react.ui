import { useRef } from "react";
import type { EditorView } from "@codemirror/view";
import { useCodeMirrorView } from "./useCodeMirrorView";
import { useExpandableEditor } from "./useExpandableEditor";
import { canFormat, useCodeFormatter } from "./useCodeFormatter";
import { CodeEditorStatusBar, CodeEditorToolbar } from "./CodeEditorChrome";
import type { CodeEditorMode, CodeEditorProps } from "./codeEditorTypes";

export type { CodeEditorProps };

const DEFAULT_ROWS: Record<CodeEditorMode, number> = {
  full: 24,
  modal: 10,
  small: 4,
  inline: 1,
};

const INSET =
  "overflow-hidden rounded-control border border-border-default bg-surface-inset focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--rui-focus-ring)]";
const EXPANDED_FRAME =
  "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-surface border border-border-default bg-surface-inset shadow-[0_24px_60px_rgba(0,0,0,.35)]";

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
  const viewRef = useRef<EditorView | null>(null);
  const { busy, error: formatError, run: format, clearError } = useCodeFormatter({
    viewRef,
    language,
    readOnly,
  });
  const { expanded, toggle, collapse, frameProps } = useExpandableEditor({
    viewRef,
    label: ariaLabel,
  });

  const { hostRef, caret, lineCount } = useCodeMirrorView({
    viewRef,
    value,
    // A stale format error describes a document that no longer exists.
    onChange: (next) => {
      clearError();
      onChange(next);
    },
    language,
    mode,
    readOnly,
    placeholder,
    completions,
    diagnostics,
    id,
    ariaLabel,
    ariaDescribedBy,
    ariaInvalid,
    ariaRequired,
    onFormat: format,
  });

  if (mode === "inline") {
    return <div ref={hostRef} className={`${INSET} ${className ?? ""}`} />;
  }

  const visibleRows = Math.max(rows ?? DEFAULT_ROWS[mode], 2);

  /*
   * Expanding swaps classes, the height variable and the dialog semantics, nothing else.
   * The element order below is fixed — React matches children by position, so a
   * conditional wrapper would reuse this div for the spacer and remount the editor,
   * destroying the view. The spacer and backdrop are always present and merely hidden.
   */
  return (
    <>
      {/* Holds the form's layout while the editor is lifted out of the flow. */}
      <div
        aria-hidden
        style={{
          display: expanded ? "block" : "none",
          height: `${visibleRows * 20 + 60}px`,
        }}
      />
      <div
        aria-hidden
        onClick={collapse}
        className={expanded ? "fixed inset-0 z-40 bg-[rgba(0,0,0,.45)]" : "hidden"}
      />
      <div
        {...frameProps}
        className={`outline-none ${expanded ? EXPANDED_FRAME : `flex flex-col ${INSET}`}`}
        style={
          {
            "--rui-code-max-h": expanded ? "100%" : `${visibleRows * 20 + 18}px`,
          } as React.CSSProperties
        }
      >
        <CodeEditorToolbar
          language={language}
          lineCount={lineCount}
          showFormat={canFormat(language) && !readOnly}
          busy={busy}
          expanded={expanded}
          onFormat={format}
          onToggleExpand={toggle}
        />

        <div ref={hostRef} className={`min-h-0 flex-1 ${className ?? ""}`} />

        <CodeEditorStatusBar
          formatError={formatError}
          caret={caret}
          expanded={expanded}
        />
      </div>
    </>
  );
}
