import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  placeholder as cmPlaceholder,
  type KeyBinding,
} from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { linter, lintGutter, lintKeymap, type Diagnostic } from "@codemirror/lint";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  syntaxTree,
  HighlightStyle,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { tags } from "@lezer/highlight";
import type {
  CodeCompletion,
  CodeCompletionSource,
  CodeDiagnosticSource,
  CodeEditorLanguage,
  CodeEditorMode,
} from "./codeEditorTypes";

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

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
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

/** Back-compat view of {@link parseMemberAccess} for callers wanting only the split. */
export function parseMemberPath(
  text: string,
  pos: number
): { path: string[]; word: string } {
  const { path, word } = parseMemberAccess(text, pos);
  return { path, word };
}

const KIND_TO_CM = {
  property: "property",
  variable: "variable",
  function: "function",
  keyword: "keyword",
  constant: "constant",
} as const;

const quoted = (name: string, quote: '"' | "'") =>
  name.replace(/\\/g, "\\\\").replace(new RegExp(quote, "g"), `\\${quote}`);

/**
 * Chooses how a name is written in. The source supplies names; deciding whether one is
 * spellable after a dot is the editor's job, since only it knows the language.
 */
function toOption(item: CodeCompletion, access: MemberAccess): Completion {
  const base: Completion = {
    label: item.label,
    detail: item.detail,
    info: item.info,
    type: item.kind ? KIND_TO_CM[item.kind] : undefined,
  };

  if (access.access === "bracket") {
    return access.quote
      ? { ...base, apply: quoted(item.label, access.quote) }
      : { ...base, apply: `"${quoted(item.label, '"')}"` };
  }

  // A name that is not an identifier cannot follow a dot: the dot itself is replaced,
  // turning `context.obj.` into `context.obj["some name"]`.
  if (access.access === "dot" && !IDENTIFIER.test(item.label)) {
    return {
      ...base,
      apply: (view, _completion, from, to) => {
        view.dispatch({
          changes: { from: from - 1, to, insert: `["${quoted(item.label, '"')}"]` },
          selection: { anchor: from - 1 + item.label.length + 4 },
        });
      },
    };
  }

  return base;
}

function completionExtension(
  getSource: () => CodeCompletionSource | undefined
): Extension {
  const source = async (ctx: CompletionContext): Promise<CompletionResult | null> => {
    const provide = getSource();
    if (!provide) return null;
    const text = ctx.state.doc.toString();
    const access = parseMemberAccess(text, ctx.pos);
    const { path, word } = access;
    // Without a path or a partial word there is nothing to narrow by, so stay quiet
    // unless the user asked with Ctrl-Space.
    if (!ctx.explicit && !word && path.length === 0) return null;

    const items = await provide({
      path,
      word,
      text,
      pos: ctx.pos,
      explicit: ctx.explicit,
    });
    if (!items.length) return null;

    return {
      from: access.from,
      to: access.to,
      options: items.map((item) => toOption(item, access)),
      // A bracketed name may contain anything but its own quote, so the cheap
      // identifier guard would end the session on the first space.
      validFor: access.access === "bracket" ? /^[^"'\]]*$/ : /^[\w$]*$/,
    };
  };

  return [
    autocompletion({ override: [source], activateOnTyping: true }),
    /*
     * A member separator must open the popup. `activateOnTyping` alone does not manage
     * it: the query runs against the word before the cursor, and `.`, `[` and a quote
     * all end a word rather than extending one. Watching applied changes rather than key
     * events covers paste and programmatic edits; the length guard keeps a pasted block
     * containing a dot from triggering. Auto-closing turns a typed `[` into `[]` and a
     * quote into a pair, hence matching anywhere in the insertion rather than at its end.
     * Deferred because starting a completion dispatches, which a listener may not do
     * inline.
     */
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      let trigger = false;
      for (const tr of update.transactions) {
        tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
          const text = inserted.sliceString(0);
          if (text.length <= 2 && /[.["']/.test(text)) trigger = true;
        });
      }
      if (trigger) queueMicrotask(() => startCompletion(update.view));
    }),
  ];
}

/** Error nodes in the parse tree — free syntax checking, no extra dependency. */
function syntaxDiagnostics(state: EditorState): Diagnostic[] {
  const out: Diagnostic[] = [];
  const docLength = state.doc.length;
  const seen = new Set<number>();
  syntaxTree(state).iterate({
    enter: (node) => {
      if (!node.type.isError) return;
      if (seen.has(node.from)) return;
      seen.add(node.from);
      // Zero-width error nodes render no mark at all; widen them by one character.
      const to = node.to > node.from ? node.to : Math.min(node.from + 1, docLength);
      if (node.from >= to) return;
      out.push({ from: node.from, to, severity: "error", message: "Syntax error" });
    },
  });
  // A broken document produces error nodes in bulk; a wall of marks helps nobody.
  return out.slice(0, 20);
}

function lintExtension(
  getSource: () => CodeDiagnosticSource | undefined,
  hasLanguage: boolean
): Extension {
  return linter(async (view) => {
    const state = view.state;
    const diagnostics: Diagnostic[] = hasLanguage ? syntaxDiagnostics(state) : [];

    const provide = getSource();
    if (provide) {
      const docLength = state.doc.length;
      const extra = await provide(state.doc.toString());
      for (const d of extra) {
        // Offsets come from outside; an out-of-range one throws inside CodeMirror.
        const from = Math.max(0, Math.min(d.from, docLength));
        const to = Math.max(from, Math.min(d.to, docLength));
        diagnostics.push({ from, to, severity: d.severity, message: d.message });
      }
    }
    return diagnostics;
  });
}

/*
 * Colours resolve to the library's own tokens, so the editor follows light/dark with
 * everything else instead of carrying a second theme definition.
 */
const highlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "var(--rui-text-faint)", fontStyle: "italic" },
  { tag: [tags.keyword, tags.moduleKeyword], color: "var(--rui-accent)" },
  { tag: [tags.controlKeyword, tags.operatorKeyword], color: "var(--rui-accent)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--rui-success)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--rui-warning)" },
  { tag: [tags.propertyName, tags.attributeName], color: "var(--rui-info)" },
  { tag: tags.function(tags.variableName), color: "var(--rui-info)" },
  { tag: [tags.variableName, tags.definition(tags.variableName)], color: "var(--rui-text-body)" },
  { tag: [tags.operator, tags.punctuation, tags.separator], color: "var(--rui-text-muted)" },
  { tag: tags.invalid, color: "var(--rui-danger)" },
]);

const baseTheme = EditorView.theme({
  "&": {
    color: "var(--rui-text-body)",
    backgroundColor: "transparent",
    fontSize: ".75rem",
  },
  "&.cm-focused": { outline: "none" },
  /*
   * Height is a CSS variable set on the host rather than a generated theme, so growing
   * the editor to full screen is a style change instead of a reconfiguration — the view
   * survives, and with it the cursor, the undo history and any open completion.
   */
  ".cm-scroller": { maxHeight: "var(--rui-code-max-h, none)", overflow: "auto" },
  ".cm-content": {
    fontFamily: "var(--rui-font-mono)",
    padding: "9px 0",
    caretColor: "var(--rui-text-body)",
  },
  ".cm-line": { padding: "0 10px" },
  ".cm-gutters": {
    backgroundColor: "color-mix(in srgb, var(--rui-text-body) 4%, transparent)",
    color: "var(--rui-text-faint)",
    border: "none",
    borderRight: "1px solid var(--rui-border-default)",
    fontFamily: "var(--rui-font-mono)",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--rui-text-body) 3%, transparent)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--rui-text-body) 6%, transparent)",
    color: "var(--rui-text-muted)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "var(--rui-accent-subtle)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--rui-text-body)" },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "var(--rui-accent-subtle)",
    outline: "1px solid var(--rui-accent)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "color-mix(in srgb, var(--rui-accent) 18%, transparent)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--rui-surface-card)",
    border: "1px solid var(--rui-border-default)",
    borderRadius: "var(--rui-radius-control)",
    color: "var(--rui-text-body)",
    boxShadow: "0 6px 18px rgba(0,0,0,.18)",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "var(--rui-font-mono)",
    fontSize: ".75rem",
    maxHeight: "16em",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--rui-accent)",
    color: "var(--rui-accent-contrast)",
  },
  ".cm-completionDetail": { color: "var(--rui-text-faint)", fontStyle: "normal" },
  ".cm-panels": {
    backgroundColor: "var(--rui-surface-card)",
    color: "var(--rui-text-body)",
    borderTop: "1px solid var(--rui-border-default)",
  },
  ".cm-panel input, .cm-panel button": {
    fontFamily: "var(--rui-font-sans)",
    fontSize: ".75rem",
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in srgb, var(--rui-warning) 35%, transparent)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "color-mix(in srgb, var(--rui-warning) 60%, transparent)",
  },
  ".cm-placeholder": { color: "var(--rui-text-faint)" },
  ".cm-lintRange-error": { backgroundImage: "none", textDecoration: "underline wavy var(--rui-danger)" },
  ".cm-lintRange-warning": { backgroundImage: "none", textDecoration: "underline wavy var(--rui-warning)" },
});

function languageExtension(language: CodeEditorLanguage): Extension[] {
  if (language === "javascript") return [javascript()];
  if (language === "json") return [json()];
  return [];
}

/**
 * Reformats the document with Prettier, imported on demand so it never lands in the
 * initial bundle. `semi: false` keeps a stored expression an expression — a trailing
 * semicolon would break a caller that wraps the string in parentheses.
 */
export async function formatDocument(
  view: EditorView,
  language: CodeEditorLanguage
): Promise<boolean> {
  // Only the two languages with a parser here; anything else is displayed, not parsed.
  if (language !== "javascript" && language !== "json") return false;
  const source = view.state.doc.toString();
  if (!source.trim()) return false;

  const [standalone, babel, estree] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
  ]);

  const formatted = await standalone.format(source, {
    parser: language === "json" ? "json" : "babel",
    plugins: [babel.default ?? babel, estree.default ?? estree],
    semi: false,
    singleQuote: false,
    printWidth: 100,
  });

  const next = formatted.replace(/\n+$/, "");
  if (next === source) return true;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: next },
    selection: { anchor: Math.min(view.state.selection.main.anchor, next.length) },
  });
  return true;
}

export type BuildExtensionsOpts = {
  language: CodeEditorLanguage;
  mode: CodeEditorMode;
  readOnly: boolean;
  placeholder?: string;
  /** Applied to the contenteditable, which is the element assistive tech sees. */
  contentAttributes?: Record<string, string>;
  onChange: (value: string) => void;
  onCaretChange: (ln: number, col: number) => void;
  onDocMetrics: (lineCount: number) => void;
  getCompletionSource: () => CodeCompletionSource | undefined;
  getDiagnosticSource: () => CodeDiagnosticSource | undefined;
  onFormat: () => void;
  /** Return true when Escape was consumed — collapsing a full-screen editor. */
  onEscape: () => boolean;
};

export function buildExtensions(opts: BuildExtensionsOpts): Extension[] {
  const { mode, language, readOnly } = opts;
  const isInline = mode === "inline";
  const showGutter = mode === "full" || mode === "modal";

  const formatBinding: KeyBinding = {
    key: "Shift-Alt-f",
    run: () => {
      opts.onFormat();
      return true;
    },
  };

  const extensions: Extension[] = [
    history(),
    drawSelection(),
    dropCursor(),
    highlightSpecialChars(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightSelectionMatches(),
    syntaxHighlighting(highlightStyle),
    ...languageExtension(language),
    completionExtension(opts.getCompletionSource),
    lintExtension(opts.getDiagnosticSource, language !== "text"),
    baseTheme,
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      formatBinding,
      // After completionKeymap on purpose: an open popup swallows Escape first.
      { key: "Escape", run: () => opts.onEscape() },
      indentWithTab,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        opts.onChange(update.state.doc.toString());
        opts.onDocMetrics(update.state.doc.lines);
      }
      if (update.docChanged || update.selectionSet) {
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        opts.onCaretChange(line.number, head - line.from + 1);
      }
    }),
  ];

  if (opts.contentAttributes) {
    extensions.push(EditorView.contentAttributes.of(opts.contentAttributes));
  }

  if (opts.placeholder) extensions.push(cmPlaceholder(opts.placeholder));
  if (readOnly) extensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false));

  if (isInline) {
    // A single-line field must stay single-line however the text arrives — typing,
    // pasting, or a completion that carries a newline.
    extensions.push(
      EditorState.transactionFilter.of((tr) => {
        if (!tr.docChanged) return tr;
        return tr.newDoc.sliceString(0).includes("\n") ? [] : tr;
      })
    );
  } else {
    extensions.push(EditorView.lineWrapping, highlightActiveLine(), search({ top: true }));
  }

  if (showGutter) {
    extensions.push(lineNumbers(), highlightActiveLineGutter(), foldGutter(), lintGutter());
  }

  return extensions;
}
