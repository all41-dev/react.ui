import { useDeferredValue, useMemo, useRef, useState } from "react";

import { useContainerWidth } from "../../hooks/useContainerWidth";
import { renderMarkdown } from "../../utils/markdown";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { opFor, type ToolAction } from "./markdownTools";

/** `"split"` shows the source and the preview side by side; `"tab"` shows one at a time. */
export type MarkdownPreviewMode = "tab" | "split";

export type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  preview?: MarkdownPreviewMode;
  id?: string;
  className?: string;
  /* Forwarded to the textarea — `renderEditor` builds these for every field. */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
};

/* Two panes are worth having from about 260px of text each; under that the tabs read
   better. Measured on the editor rather than the viewport — the field is as likely to be
   in a 320px drawer as across a full-width form. */
const SPLIT_MIN_WIDTH = 560;

const paneClass = "min-h-[118px] text-[.8125rem] leading-[1.6] text-body";
const previewClass =
  "space-y-3 overflow-y-auto px-3 py-2 text-[.8125rem] leading-[1.6] text-body";

export function MarkdownEditor({
  value,
  onChange,
  rows = 8,
  placeholder,
  preview = "tab",
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
  "aria-label": ariaLabel,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { ref: rootRef, width } = useContainerWidth<HTMLDivElement>();
  const split = preview === "split" && width >= SPLIT_MIN_WIDTH;

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

  const source = (
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
      className={`${paneClass} block w-full resize-y bg-transparent p-2.5 outline-none placeholder:text-faint`}
    />
  );

  /* Parsing is the expensive part of a keystroke, and in split mode it would run on
     every one. Deferred so the textarea stays ahead of the preview, memoised so the
     write tab parses nothing at all. */
  const previewSource = useDeferredValue(value);
  const rendered = useMemo(
    () =>
      previewSource?.trim() ? (
        renderMarkdown(previewSource)
      ) : (
        <p className="text-faint">Nothing to preview</p>
      ),
    [previewSource]
  );

  return (
    <div
      ref={rootRef}
      className="flex flex-col overflow-hidden rounded-control border border-border-default bg-surface-inset focus-within:border-accent focus-within:ring-2 focus-within:ring-[var(--rui-focus-ring)]"
    >
      {/* Split shows both panes, so there is nothing for the tabs to switch between. */}
      <MarkdownToolbar
        tab={split ? undefined : tab}
        onTabChange={split ? undefined : setTab}
        onTool={runTool}
      />

      {split ? (
        /* One row, two tracks, sized by the textarea — the pane that resizes. The preview
           is taken out of flow so it can never be what makes the row taller; `inset-0`
           then gives it a definite box to scroll inside. */
        <div className="grid grid-cols-2 divide-x divide-border-default">
          <div className="min-w-0">{source}</div>
          <div className="relative min-w-0">
            {/* Named: side by side the preview is an anonymous sibling of the textarea,
                where in tab mode it is found by the tab that revealed it. */}
            <div
              role="region"
              aria-label="Preview"
              className={`${previewClass} absolute inset-0`}
            >
              {rendered}
            </div>
          </div>
        </div>
      ) : tab === "write" ? (
        source
      ) : (
        <div className={`${previewClass} min-h-[118px] max-h-[280px]`}>{rendered}</div>
      )}
    </div>
  );
}
