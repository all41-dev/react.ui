import { useRef, useState } from "react";

export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  rows?: number;
  placeholder?: string;
  id?: string;
  className?: string;
  /*
   * `renderEditor` builds these for every field, but this component didn't accept them,
   * so a validation error on a code field was announced to nobody — the textarea claimed
   * to be valid and pointed at no description. They forward to the real control.
   */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
};

/**
 * Code editor over a plain textarea: language chip and line count in the header, a
 * scroll-synced line-number gutter, Tab inserts two spaces, Ln/Col in the footer.
 */
export function CodeEditor({
  value,
  onChange,
  language = "text",
  rows = 10,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  "aria-label": ariaLabel,
}: CodeEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [caret, setCaret] = useState({ ln: 1, col: 1 });

  const text = value ?? "";
  const lineCount = text.split("\n").length;

  const trackCaret = () => {
    const ta = taRef.current;
    if (!ta) return;
    const upto = ta.value.slice(0, ta.selectionStart);
    const ln = upto.split("\n").length;
    const col = upto.length - upto.lastIndexOf("\n");
    setCaret({ ln, col });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    // Keep Tab-for-focus escape hatch: Shift+Tab still leaves the field.
    if (e.shiftKey) return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart: s, selectionEnd: end } = ta;
    const next = ta.value.slice(0, s) + "  " + ta.value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.setSelectionRange(s + 2, s + 2);
      trackCaret();
    });
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-control border border-border-default bg-surface-inset focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--rui-focus-ring)]">
      <div className="flex items-center justify-between border-b border-border-default bg-surface-card px-2 py-1">
        <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[.6875rem] font-semibold uppercase tracking-wide text-muted">
          {language}
        </span>
        <span className="font-mono text-[.6875rem] text-faint">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
      </div>

      <div className="flex" style={{ maxHeight: `${Math.max(rows, 3) * 20 + 24}px` }}>
        <div
          ref={gutterRef}
          aria-hidden
          className="select-none overflow-hidden whitespace-pre border-r border-border-default bg-[color-mix(in_srgb,var(--rui-text-body)_4%,transparent)] py-[9px] pl-2.5 pr-2 text-right font-mono text-[.75rem] leading-[1.6] text-faint"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={taRef}
          id={id}
          value={text}
          onChange={(e) => {
            onChange(e.target.value);
            trackCaret();
          }}
          onKeyDown={onKeyDown}
          onScroll={(e) => {
            if (gutterRef.current)
              gutterRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          onSelect={trackCaret}
          onClick={trackCaret}
          onKeyUp={trackCaret}
          rows={rows}
          placeholder={placeholder}
          spellCheck={false}
          wrap="off"
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-required={ariaRequired}
          aria-label={ariaLabel}
          className="block w-full resize-none overflow-auto whitespace-pre bg-transparent px-2.5 py-[9px] font-mono text-[.75rem] leading-[1.6] text-body outline-none [tab-size:2] placeholder:text-faint"
        />
      </div>

      <div className="border-t border-border-default bg-surface-card px-2 py-1 text-right font-mono text-[.6875rem] text-faint">
        Ln {caret.ln}, Col {caret.col}
      </div>
    </div>
  );
}
