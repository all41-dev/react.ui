import { useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { Braces, Copy, X } from "lucide-react";
import { useFlyoutDialog } from "../../hooks/useFlyoutDialog";
import { copyText } from "../../utils/clipboard";
import { toast } from "../../utils/toast";
import type { CodeEditorLanguage } from "../datagrid/ui/editors/codeEditorTypes";
import { IconButton } from "../IconButton";
import { LazyCodeView } from "../LazyCode";
import type { JsonTarget } from "./jsonTarget";

/*
 * Drawer showing a record verbatim: an object as formatted JSON, a string as
 * it is. Modal over the whole page, closed by Escape, the scrim, or its
 * button; focus returns to the control that opened it.
 */

type Props = JsonTarget & { onClose: () => void };

const LANGUAGE_LABEL: Record<CodeEditorLanguage, string> = {
  json: "JSON",
  javascript: "JavaScript",
  text: "Text",
};

function formatValue(value: unknown): string {
  // Code snippets arrive as plain strings; JSON-escaping them onto one line
  // would make them unreadable.
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function JsonInspector({ title, value, language, kind, onClose }: Props) {
  const titleId = useId();
  const { slotRef, panelRef, onKeyDown } = useFlyoutDialog(true, onClose);

  const text = useMemo(() => formatValue(value), [value]);
  const grammar: CodeEditorLanguage =
    typeof value === "string" ? (language ?? "text") : "json";
  const lines = text ? text.split("\n").length : 0;
  const size = useMemo(() => new TextEncoder().encode(text).length, [text]);

  const copy = () => {
    void copyText(text).then((ok) =>
      ok ? toast.success("Copied") : toast.error("Could not copy")
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      {/* Outside the dialog slot on purpose: a pointerdown here is what the
          dialog hook reads as "outside" and closes on. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-backdrop-in bg-black/50 motion-reduce:animate-none"
      />
      {/* The role and the key handler go together: the hook's Escape and Tab
          trap are the dialog's. */}
      <div
        ref={slotRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          // The code view claims Escape only while its find panel is open;
          // that press closes the panel, the next one the drawer.
          if (e.key === "Escape" && e.defaultPrevented) return;
          onKeyDown(e);
        }}
        className="absolute inset-y-0 right-0 w-[min(640px,calc(100vw-32px))] animate-drawer-in border-l border-border-default bg-surface-card text-body shadow-[var(--elev-3)] outline-none motion-reduce:animate-none"
      >
        <div ref={panelRef} className="flex h-full flex-col">
          <header className="flex flex-none items-center gap-2.5 border-b border-border-default py-2.5 pr-2.5 pl-3.5">
            <span
              aria-hidden="true"
              className="grid size-7 flex-none place-items-center rounded-md bg-[color-mix(in_srgb,var(--rui-info)_12%,transparent)] text-info"
            >
              <Braces size={14} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <h2 id={titleId} className="truncate text-[.8125rem] font-semibold">
                {title}
              </h2>
              {kind && (
                <span className="truncate font-mono text-[.6875rem] text-faint">
                  {kind}
                </span>
              )}
            </span>
            <IconButton label="Copy to clipboard" data-autofocus onClick={copy}>
              <Copy size={14} aria-hidden="true" />
            </IconButton>
            <IconButton label="Close JSON inspector" title="Close (Esc)" onClick={onClose}>
              <X size={14} aria-hidden="true" />
            </IconButton>
          </header>

          <div className="m-3.5 min-h-0 flex-1 overflow-hidden rounded-lg border border-border-default bg-surface-inset">
            <LazyCodeView
              value={text}
              language={grammar}
              fill
              aria-label={`${title} as ${LANGUAGE_LABEL[grammar]}`}
            />
          </div>

          <footer className="flex flex-none items-center gap-3 border-t border-border-default px-3.5 py-2 font-mono text-[.6875rem] text-faint">
            <span>{lines} lines</span>
            <span aria-hidden="true">·</span>
            <span>{formatSize(size)}</span>
            <span aria-hidden="true">·</span>
            <span>{LANGUAGE_LABEL[grammar]}</span>
          </footer>
        </div>
      </div>
    </div>,
    document.body
  );
}
