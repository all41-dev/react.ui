import type { CodeEditorLanguage } from "./codeEditorTypes";

const BUTTON =
  "cursor-pointer rounded px-1.5 py-0.5 text-[.6875rem] text-faint transition-colors hover:bg-surface-raised hover:text-body";

export function CodeEditorToolbar(props: {
  language: CodeEditorLanguage;
  lineCount: number;
  showFormat: boolean;
  busy: boolean;
  expanded: boolean;
  onFormat: () => void;
  onToggleExpand: () => void;
}) {
  const { language, lineCount, showFormat, busy, expanded } = props;
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border-default bg-surface-card px-2 py-1">
      <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[.6875rem] font-semibold uppercase tracking-wide text-muted">
        {language}
      </span>
      <div className="flex items-center gap-2">
        {showFormat && (
          <button
            type="button"
            onClick={props.onFormat}
            disabled={busy}
            title="Format (Shift+Alt+F)"
            className={`${BUTTON} disabled:opacity-40`}
          >
            {busy ? "Formatting…" : "Format"}
          </button>
        )}
        <button
          type="button"
          onClick={props.onToggleExpand}
          title={expanded ? "Collapse (Esc)" : "Expand to full screen"}
          aria-expanded={expanded}
          className={BUTTON}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
        <span className="font-mono text-[.6875rem] text-faint">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
      </div>
    </div>
  );
}

export function CodeEditorStatusBar(props: {
  formatError: string | null;
  caret: { ln: number; col: number };
  expanded: boolean;
}) {
  const { formatError, caret, expanded } = props;
  /* Ctrl+M is the only way out of the editor by keyboard — Tab indents — so WCAG 2.1.2
     requires advertising it. The visible hint is hidden on a narrow viewport; the title
     is what carries it there. */
  const hints = `Ctrl+Space suggestions · Ctrl+F find · Ctrl+M tab focus${
    expanded ? " · Esc collapses" : ""
  }`;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border-default bg-surface-card px-2 py-1 font-mono text-[.6875rem] text-faint">
      {/* Live, because a format failure is otherwise announced to nobody; the title
          carries the message the truncated span cuts off. */}
      <span role="status" title={formatError ?? undefined} className="truncate text-danger">
        {formatError}
      </span>
      <span className="flex shrink-0 items-center gap-3" title={hints}>
        <span className="hidden sm:inline">{hints}</span>
        <span>
          Ln {caret.ln}, Col {caret.col}
        </span>
      </span>
    </div>
  );
}
