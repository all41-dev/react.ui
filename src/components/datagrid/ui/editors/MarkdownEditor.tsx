import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";
import { useRef, useState } from "react";

import { renderMarkdown } from "../../utils/markdown";

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  id?: string;
  className?: string;
  /*
   * `renderEditor` builds these for every field, but this component didn't accept them,
   * so a validation error on a markdown field was announced to nobody — the textarea
   * claimed to be valid and pointed at no description. They forward to the real control.
   */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
};

type SelectionOp = (
  value: string,
  start: number,
  end: number
) => { next: string; selStart: number; selEnd: number };

type ToolAction =
  | "heading"
  | "bold"
  | "italic"
  | "code"
  | "bullet"
  | "numbered"
  | "quote"
  | "link";

/** Static — no render-scope closures, so ref access stays inside event handlers. */
const TOOLS: { action: ToolAction; label: string; Icon: typeof Bold }[] = [
  { action: "heading", label: "Heading", Icon: Heading2 },
  { action: "bold", label: "Bold", Icon: Bold },
  { action: "italic", label: "Italic", Icon: Italic },
  { action: "code", label: "Code", Icon: Code },
  { action: "bullet", label: "Bullet list", Icon: List },
  { action: "numbered", label: "Numbered list", Icon: ListOrdered },
  { action: "quote", label: "Quote", Icon: Quote },
  { action: "link", label: "Link", Icon: Link },
];

export function MarkdownEditor({
  value,
  onChange,
  rows = 8,
  placeholder,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  "aria-label": ariaLabel,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Called from event handlers only — reads the textarea ref at call time.
  const runTool = (action: ToolAction) => {
    const ta = taRef.current;
    if (!ta) return;

    const apply = (op: SelectionOp) => {
      const { next, selStart, selEnd } = op(ta.value, ta.selectionStart, ta.selectionEnd);
      onChange(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(selStart, selEnd);
      });
    };

    const wrap = (before: string, after = before, placeholderText = "text") =>
      apply((v, s, e) => {
        const sel = v.slice(s, e) || placeholderText;
        const next = v.slice(0, s) + before + sel + after + v.slice(e);
        return { next, selStart: s + before.length, selEnd: s + before.length + sel.length };
      });

    const prefixLines = (prefix: string, numbered = false) =>
      apply((v, s, e) => {
        const blockStart = v.lastIndexOf("\n", s - 1) + 1;
        const lineEnd = v.indexOf("\n", e);
        const blockEnd = lineEnd === -1 ? v.length : lineEnd;
        const block = v
          .slice(blockStart, blockEnd)
          .split("\n")
          .map((l, i) => (numbered ? `${i + 1}. ` : prefix) + l)
          .join("\n");
        const next = v.slice(0, blockStart) + block + v.slice(blockEnd);
        return { next, selStart: blockStart, selEnd: blockStart + block.length };
      });

    switch (action) {
      case "heading":
        return prefixLines("## ");
      case "bold":
        return wrap("**");
      case "italic":
        return wrap("*");
      case "code":
        return wrap("`");
      case "bullet":
        return prefixLines("- ");
      case "numbered":
        return prefixLines("", true);
      case "quote":
        return prefixLines("> ");
      case "link":
        return wrap("[", "](url)");
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-control border border-border-default bg-surface-inset focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--rui-focus-ring)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default bg-surface-card px-2 py-1">
        <div className="flex items-center gap-0.5">
          {TOOLS.map(({ action, label, Icon }) => (
            <button
              key={action}
              type="button"
              title={label}
              aria-label={label}
              // Fire before the textarea loses its selection.
              onMouseDown={(e) => {
                e.preventDefault();
                runTool(action);
              }}
              disabled={tab === "preview"}
              className="grid h-6 min-w-[26px] cursor-pointer place-items-center rounded-[5px] px-1.5 text-faint transition-colors hover:bg-surface-raised hover:text-body disabled:opacity-40"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 rounded-md bg-surface-inset p-0.5 text-[.75rem]">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`cursor-pointer rounded px-2 py-0.5 capitalize transition-colors ${
                tab === t
                  ? "bg-surface-card font-semibold text-accent shadow-[0_1px_2px_rgba(0,0,0,.18)]"
                  : "text-faint hover:text-body"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          ref={taRef}
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-required={ariaRequired}
          aria-label={ariaLabel}
          className="block min-h-[118px] w-full resize-y bg-transparent p-2.5 text-[.8125rem] leading-[1.6] text-body outline-none placeholder:text-faint"
        />
      ) : (
        <div className="max-h-[280px] min-h-[118px] space-y-3 overflow-y-auto px-3 py-2 text-[.8125rem] leading-[1.6] text-body">
          {value?.trim() ? (
            renderMarkdown(value)
          ) : (
            <p className="text-faint">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  );
}
