/*
 * Reads the member chain under the cursor. Kept free of CodeMirror imports so the
 * parser can be tested and reused without an editor.
 */

/** How the member under the cursor is being written. */
export type MemberAccessKind = "plain" | "dot" | "bracket";

export type MemberAccess = {
  /** Segments already resolved, from either notation. */
  path: string[];
  /** The partial member being typed. May contain spaces inside brackets. */
  word: string;
  /** Range the completion replaces. */
  from: number;
  to: number;
  access: MemberAccessKind;
  /** Quote in use when the cursor sits inside `["…"]`. Absent right after `[`. */
  quote?: '"' | "'";
};

const isIdentChar = (c: string | undefined) => !!c && /[\w$]/.test(c);
const isIdentStart = (c: string | undefined) => !!c && /[A-Za-z_$]/.test(c);
const isSpace = (c: string | undefined) => !!c && /\s/.test(c);

/** Reads `["some name"]` backwards from its closing bracket. */
function readBracketSegment(
  text: string,
  closeIndex: number
): { value: string; open: number } | null {
  let k = closeIndex - 1;
  while (isSpace(text[k])) k--;
  const quote = text[k];
  if (quote !== '"' && quote !== "'") return null;

  let s = k - 1;
  while (s >= 0) {
    if (text[s] === quote) {
      let slashes = 0;
      let t = s - 1;
      while (t >= 0 && text[t] === "\\") {
        slashes++;
        t--;
      }
      if (slashes % 2 === 0) break;
    }
    s--;
  }
  if (s < 0) return null;

  let open = s - 1;
  while (isSpace(text[open])) open--;
  if (text[open] !== "[") return null;

  return { value: text.slice(s + 1, k).replace(/\\(.)/g, "$1"), open };
}

/** Walks the resolved part of the chain backwards from `end` (inclusive). */
function parseChain(text: string, end: number): string[] | null {
  const segments: string[] = [];
  let i = end + 1;

  for (;;) {
    while (i > 0 && isSpace(text[i - 1])) i--;
    if (i <= 0) break;

    if (text[i - 1] === "]") {
      const bracket = readBracketSegment(text, i - 1);
      if (!bracket) return null;
      segments.push(bracket.value);
      i = bracket.open;
      // `obj["a"]["b"]` chains with no separator between the segments.
      continue;
    }

    if (isIdentChar(text[i - 1])) {
      let j = i;
      while (j > 0 && isIdentChar(text[j - 1])) j--;
      if (!isIdentStart(text[j])) return null;
      segments.push(text.slice(j, i));
      i = j;
      while (i > 0 && isSpace(text[i - 1])) i--;
      if (text[i - 1] !== ".") break;
      i--;
      continue;
    }

    break;
  }

  return segments.reverse();
}

/**
 * Splits what the user has typed into the resolved prefix and the partial member.
 *
 * Both notations are understood, because a source-system column name is not always a
 * valid identifier: `context.obj["some name"].ci` yields
 * `{ path: ["context", "obj", "some name"], word: "ci" }`.
 */
export function parseMemberAccess(text: string, pos: number): MemberAccess {
  const nothing: MemberAccess = {
    path: [],
    word: "",
    from: pos,
    to: pos,
    access: "plain",
  };

  // Inside an unterminated `["…` — the only case where the word may hold spaces.
  for (let k = pos - 1; k >= 1; k--) {
    const c = text[k];
    if (c === "\n") break;
    if ((c === '"' || c === "'") && text[k - 1] === "[") {
      const inner = text.slice(k + 1, pos);
      // A quote inside means that string already closed, so the cursor is past it.
      if (inner.includes(c)) break;
      const path = parseChain(text, k - 2);
      if (!path?.length) return nothing;
      return {
        path,
        word: inner,
        from: k + 1,
        to: pos,
        access: "bracket",
        quote: c,
      };
    }
  }

  // Right after `[`, before any quote is typed.
  if (text[pos - 1] === "[") {
    const path = parseChain(text, pos - 2);
    if (!path?.length) return nothing;
    return { path, word: "", from: pos, to: pos, access: "bracket" };
  }

  let j = pos;
  while (j > 0 && isIdentChar(text[j - 1])) j--;
  const word = text.slice(j, pos);

  if (text[j - 1] === ".") {
    const path = parseChain(text, j - 2);
    if (!path?.length) return nothing;
    return { path, word, from: j, to: pos, access: "dot" };
  }

  return { path: [], word, from: j, to: pos, access: "plain" };
}
