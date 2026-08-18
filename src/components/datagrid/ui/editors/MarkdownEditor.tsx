import { useRef, useState } from "react";

import { renderMarkdown } from "../../utils/markdown";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { opFor, type ToolAction } from "./markdownTools";

export type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  id?: string;
  className?: string;
  /* Forwarded to the textarea — `renderEditor` builds these for every field. */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
};

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
    const { next, selStart, selEnd } = opFor(action)(
      ta.value,
      ta.selectionStart,
      ta.selectionEnd
    );
    onChange(next);
    // The value lands on the next render; restoring the range before that is a no-op.
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-control border border-border-default bg-surface-inset focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--rui-focus-ring)]">
      <MarkdownToolbar tab={tab} onTabChange={setTab} onTool={runTool} />

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
