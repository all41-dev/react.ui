import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Minimal markdown renderer.                                          */
/* Produces React nodes directly, so no user input is ever parsed as   */
/* HTML — but link TARGETS still need sanitizing: React will happily   */
/* render href="javascript:…" and it executes on click.                */
/*                                                                     */
/* Pure functions, no component state, no icon imports — kept apart    */
/* from MarkdownEditor so a read-only render path does not drag the    */
/* editor and its lucide icons in behind it.                          */
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
