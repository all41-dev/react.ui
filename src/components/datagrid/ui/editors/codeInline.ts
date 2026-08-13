import { EditorState, type Extension } from "@codemirror/state";

/** Inline mode holds one line, so a seeded newline is flattened rather than rejected. */
export const toSingleLine = (value: string) => value.replace(/\r?\n/g, " ");

/**
 * Keeps an inline field on one line however the text arrives — typing, pasting, or a
 * completion that carries a newline.
 *
 * Only the inserted text is inspected: testing the resulting document would reject every
 * edit once a newline had reached it, freezing the field. The initial state is not a
 * transaction and so bypasses this entirely, which is why a seeded value goes through
 * {@link toSingleLine} instead.
 */
export function singleLineFilter(): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr;
    let hasNewline = false;
    tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
      if (inserted.sliceString(0).includes("\n")) hasNewline = true;
    });
    return hasNewline ? [] : tr;
  });
}
