import { EditorView } from "@codemirror/view";
import { EditorState, type Extension } from "@codemirror/state";
import {
  autocompletion,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { parseMemberAccess, type MemberAccess } from "./codeMemberAccess";
import type { CodeCompletion, CodeCompletionSource } from "./codeEditorTypes";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

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
    const insert = `["${quoted(item.label, '"')}"]`;
    return {
      ...base,
      apply: (view, _completion, from, to) => {
        view.dispatch({
          changes: { from: from - 1, to, insert },
          // Measured on the escaped text, not the raw label — a name carrying a quote
          // or a backslash is longer once written in.
          selection: { anchor: from - 1 + insert.length },
        });
      },
    };
  }

  return base;
}

export function completionExtension(
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
    autocompletion({ activateOnTyping: true }),
    /*
     * Registered as language data rather than through `override`, which would replace
     * every other source — including the language's own keywords and snippets. Composing
     * lets JavaScript complete `function`, `const` and the rest in ordinary positions
     * while the domain source owns member position. The language suppresses its keywords
     * after a `.` and inside strings, so the two never compete for the same spot.
     */
    EditorState.languageData.of(() => [{ autocomplete: source }]),
    /*
     * A member separator must open the popup. `activateOnTyping` alone does not manage
     * it: the query runs against the word before the cursor, and `.`, `[` and a quote
     * all end a word rather than extending one. Watching applied changes rather than key
     * events covers paste and programmatic edits; the length guard keeps a pasted block
     * containing a dot from triggering. Auto-closing turns a typed `[` into `[]` and a
     * quote into a pair, hence matching anywhere in the insertion rather than at its end.
     * Deferred because starting a completion dispatches, which a listener may not do
     * inline. `startCompletion` is the only public way in and marks the session
     * `explicit`, which is why that flag means "not a background keystroke" rather than
     * "the user pressed Ctrl-Space".
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
