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
import { useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Minimal markdown renderer.                                          */
/* Produces React nodes directly, so no user input is ever parsed as   */
/* HTML — but link TARGETS still need sanitizing: React will happily   */
/* render href="javascript:…" and it executes on click.                */
/* ------------------------------------------------------------------ */

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;

/*
 * Scheme allowlist for `[label](href)`. React renders whatever string it is given as
 * an href, so `[x](javascript:fetch('/api/keys'))` produced a working link in the
 * preview pane — a real XSS vector in a library that renders user-authored content.
 *
 * Allowlist rather than a `javascript:` denylist: `data:`, `vbscript:` and whatever a
 * browser ships next are all equally dangerous. Any future image support needs the
 * same check on its `src`.
 */
const ALLOWED_SCHEMES = /^(?:https?|mailto|tel|ftp):$/i;
/** A URL is relative — and therefore safe — when nothing before the path is a scheme. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function safeHref(raw: string): string | undefined {
  // Strip spaces and C0 controls first: browsers ignore them when resolving a URL, so
  // "java\0script:x" would otherwise read as scheme-less and slip through.
  const href = Array.from(raw)
    .filter((ch) => ch.charCodeAt(0) > 32)
    .join("");
  if (href === "") return undefined;
  const scheme = HAS_SCHEME.exec(href)?.[0];
  // No scheme at all → relative ("/docs", "docs/page", "#anchor", "?q=1"). Nothing a
  // relative URL can resolve to executes script.
  if (!scheme) return href;
  return ALLOWED_SCHEMES.test(scheme) ? href : undefined;
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(INLINE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    const tok = m[0];
    if (tok.startsWith("`")) {
      out.push(
        <code key={k++} className="rounded bg-surface-inset px-1 py-0.5 font-mono text-[.8em]">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("**")) {
      out.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith("*")) {
      out.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    } else {
      const label = tok.slice(1, tok.indexOf("]"));
      const href = safeHref(tok.slice(tok.indexOf("(") + 1, -1));
      out.push(
        href === undefined ? (
          // Disallowed scheme — show the source text so nothing is silently swallowed,
          // but never as a clickable target.
          <span key={k++}>{tok}</span>
        ) : (
          <a
            key={k++}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[var(--rui-link)] underline hover:text-[var(--rui-link-hover)]"
          >
            {label}
          </a>
        )
      );
    }
    last = i + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function renderMarkdown(src: string): ReactNode[] {
  const lines = src.split("\n");
  const out: ReactNode[] = [];
  let k = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++; // closing fence
      out.push(
        <pre
          key={k++}
          className="overflow-x-auto rounded-md bg-surface-inset p-3 font-mono text-xs leading-5"
        >
          {buf.join("\n")}
        </pre>
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const Tag = `h${Math.min(level + 1, 6)}` as "h2";
      const size = ["text-lg", "text-base", "text-sm"][Math.min(level - 1, 2)];
      out.push(
        <Tag key={k++} className={`${size} font-semibold text-body`}>
          {renderInline(heading[2])}
        </Tag>
      );
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) buf.push(lines[i++].slice(2));
      out.push(
        <blockquote
          key={k++}
          className="border-l-2 border-accent pl-3 text-muted italic"
        >
          {renderInline(buf.join(" "))}
        </blockquote>
      );
      continue;
    }

    const isBullet = (l: string) => /^[-*]\s+/.test(l);
    if (isBullet(line)) {
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i])) items.push(lines[i++].replace(/^[-*]\s+/, ""));
      out.push(
        <ul key={k++} className="list-disc space-y-1 pl-5">
          {items.map((t, j) => (
            <li key={j}>{renderInline(t)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const isNumbered = (l: string) => /^\d+\.\s+/.test(l);
    if (isNumbered(line)) {
      const items: string[] = [];
      while (i < lines.length && isNumbered(lines[i]))
        items.push(lines[i++].replace(/^\d+\.\s+/, ""));
      out.push(
        <ol key={k++} className="list-decimal space-y-1 pl-5">
          {items.map((t, j) => (
            <li key={j}>{renderInline(t)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: consume until blank line or a block start.
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6})\s|^> |^[-*]\s|^\d+\.\s|^```/.test(lines[i])
    )
      buf.push(lines[i++]);
    out.push(<p key={k++}>{renderInline(buf.join(" "))}</p>);
  }
  return out;
}

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
