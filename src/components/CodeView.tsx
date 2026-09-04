import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { buildViewExtensions } from "./datagrid/ui/editors/codeMirrorSetup";
import type { CodeEditorLanguage } from "./datagrid/ui/editors/codeEditorTypes";

export type CodeViewProps = {
  value: string;
  /** Grammar; `"text"` renders uncoloured. */
  language?: CodeEditorLanguage;
  /** Line-number gutter with fold handles. */
  lineNumbers?: boolean;
  /** Soft-wrap long lines, as the editor does. */
  wrap?: boolean;
  /**
   * `true`: take the host's full height and scroll inside it. `false`: grow with the
   * content, capped at `rows` visible lines when given.
   */
  fill?: boolean;
  rows?: number;
  /** Classes on the host — border, background, padding; the view itself has no chrome. */
  className?: string;
  "aria-label"?: string;
};

/**
 * Read-only code on the code editor's engine and palette: highlighting, folding,
 * bracket matching and find (Ctrl+F), with none of the editor's toolbar or status bar.
 * The content is focusable, so the keyboard can scroll, search and fold it.
 */
export function CodeView({
  value,
  language = "text",
  lineNumbers = true,
  wrap = true,
  fill = false,
  rows,
  className,
  "aria-label": ariaLabel,
}: CodeViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: buildViewExtensions({ language, lineNumbers, wrap, fill, ariaLabel }),
      }),
      parent: host,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The document is seeded once; later values are applied by the sync effect below,
    // which keeps the scroll position and any folds the reader has made.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, lineNumbers, wrap, fill, ariaLabel]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  const style =
    !fill && rows
      ? ({ "--rui-code-max-h": `${Math.max(rows, 1) * 20 + 18}px` } as CSSProperties)
      : undefined;

  return (
    <div
      ref={hostRef}
      className={[fill ? "h-full min-h-0" : "", className ?? ""].filter(Boolean).join(" ")}
      style={style}
    />
  );
}
