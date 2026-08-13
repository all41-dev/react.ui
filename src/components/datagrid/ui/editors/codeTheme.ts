import { EditorView } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/*
 * Colours resolve to the library's own tokens, so the editor follows light/dark with
 * everything else instead of carrying a second theme definition.
 */
export const highlightStyle = HighlightStyle.define([
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

export const baseTheme = EditorView.theme({
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
