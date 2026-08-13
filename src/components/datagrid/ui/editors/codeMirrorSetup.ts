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
import { EditorState, type Compartment, type Extension } from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintGutter, lintKeymap } from "@codemirror/lint";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { completionExtension } from "./codeCompletion";
import { singleLineFilter } from "./codeInline";
import { lintExtension } from "./codeLint";
import { baseTheme, highlightStyle } from "./codeTheme";
import type {
  CodeCompletionSource,
  CodeDiagnosticSource,
  CodeEditorLanguage,
  CodeEditorMode,
} from "./codeEditorTypes";

function languageExtension(language: CodeEditorLanguage): Extension[] {
  if (language === "javascript") return [javascript()];
  if (language === "json") return [json()];
  return [];
}

export type BuildExtensionsOpts = {
  language: CodeEditorLanguage;
  mode: CodeEditorMode;
  readOnly: boolean;
  placeholder?: string;
  /**
   * Applied to the contenteditable, which is the element assistive tech sees. Held in a
   * compartment: `aria-invalid` and `aria-describedby` change as validation runs, and
   * rebuilding the view for that would drop the cursor mid-edit.
   */
  attributesCompartment: Compartment;
  contentAttributes: Record<string, string>;
  onChange: (value: string) => void;
  onCaretChange: (ln: number, col: number) => void;
  onDocMetrics: (lineCount: number) => void;
  getCompletionSource: () => CodeCompletionSource | undefined;
  getDiagnosticSource: () => CodeDiagnosticSource | undefined;
  onFormat: () => void;
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
    opts.attributesCompartment.of(
      EditorView.contentAttributes.of(opts.contentAttributes)
    ),
    /*
     * No *custom* Escape binding: whether the key gets consumed is the contract the
     * surrounding dialog reads. `completionKeymap` and `searchKeymap` claim it while a
     * popup or the find panel is open, `defaultKeymap` claims it to collapse a non-empty
     * selection, and CodeMirror calls `preventDefault` only then — so an Escape nothing
     * wanted reaches the dialog and closes it.
     *
     * Tab indents everywhere but inline, where a one-line field has nothing to indent and
     * focus movement is the only way out of a cell popover. Elsewhere the exit is Ctrl-m
     * (`toggleTabFocusMode`, from `defaultKeymap`), advertised in the status bar.
     */
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      formatBinding,
      ...(isInline ? [] : [indentWithTab]),
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

  if (opts.placeholder) extensions.push(cmPlaceholder(opts.placeholder));
  if (readOnly) extensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false));

  if (isInline) {
    extensions.push(singleLineFilter());
  } else {
    extensions.push(EditorView.lineWrapping, highlightActiveLine(), search({ top: true }));
  }

  if (showGutter) {
    extensions.push(lineNumbers(), highlightActiveLineGutter(), foldGutter(), lintGutter());
  }

  return extensions;
}
