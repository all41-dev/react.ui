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

export type ToolAction =
  | "heading"
  | "bold"
  | "italic"
  | "code"
  | "bullet"
  | "numbered"
  | "quote"
  | "link";

/** A pure selection transform: value plus selection in, next value plus selection out. */
export type SelectionOp = (
  value: string,
  start: number,
  end: number
) => { next: string; selStart: number; selEnd: number };

/** Static — no render-scope closures, so ref access stays inside event handlers. */
export const TOOLS: { action: ToolAction; label: string; Icon: typeof Bold }[] = [
  { action: "heading", label: "Heading", Icon: Heading2 },
  { action: "bold", label: "Bold", Icon: Bold },
  { action: "italic", label: "Italic", Icon: Italic },
  { action: "code", label: "Code", Icon: Code },
  { action: "bullet", label: "Bullet list", Icon: List },
  { action: "numbered", label: "Numbered list", Icon: ListOrdered },
  { action: "quote", label: "Quote", Icon: Quote },
  { action: "link", label: "Link", Icon: Link },
];

/** Wraps the selection, substituting `placeholderText` when nothing is selected. */
function wrap(before: string, after = before, placeholderText = "text"): SelectionOp {
  return (v, s, e) => {
    const sel = v.slice(s, e) || placeholderText;
    const next = v.slice(0, s) + before + sel + after + v.slice(e);
    return { next, selStart: s + before.length, selEnd: s + before.length + sel.length };
  };
}

/** Prefixes every line the selection touches, expanding to whole-line boundaries. */
function prefixLines(prefix: string, numbered = false): SelectionOp {
  return (v, s, e) => {
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
  };
}

export function opFor(action: ToolAction): SelectionOp {
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
}
