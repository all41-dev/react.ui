import type { FC } from "react";
import { renderMarkdown } from "./datagrid/utils/markdown";

export interface MarkdownProps {
  /** Markdown source. Blank renders nothing at all. */
  source: string;
  /** Classes on the wrapper — size and colour; the blocks inside carry their own. */
  className?: string;
}

/**
 * Read-only markdown, rendered exactly as the markdown editor's preview renders
 * it: the same block and inline vocabulary, built as React nodes so the source is
 * never parsed as HTML, with link targets filtered to safe schemes.
 */
export const Markdown: FC<MarkdownProps> = ({ source, className }) => {
  if (!source.trim()) return null;
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      {renderMarkdown(source)}
    </div>
  );
};
