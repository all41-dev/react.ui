import { lazy, type ComponentType } from "react";

import type { EditorKind } from "../../types/column";
import { DateInput } from "../inputs/DateInput";
import { NumberInput } from "../inputs/NumberInput";
import { SelectInput } from "../inputs/SelectInput";
import { TextArea } from "../inputs/TextArea";
import { TextInput } from "../inputs/TextInput";
import { TimeInput } from "../inputs/TimeInput";

/**
 * What the registry hands every editor: one prop bag, narrowed inside each control.
 * The editors take heterogeneous prop shapes, so there is no single honest props type.
 */
type EditorControl = ComponentType<Record<string, unknown>>;

/*
 * The two rich editors load on demand. This module is reached unconditionally from
 * `DataGrid` (EditorRegistry → EditFormBody / CellEditPopover → GridEditors), so a static
 * import here puts the whole CodeMirror engine in front of every consumer, including a
 * grid whose columns are all `editor: "text"`. Keep them dynamic.
 *
 * Anything rendering one of these must sit inside a `<Suspense>` — see `isRichEditor`.
 */
const CodeEditor: EditorControl = lazy(() =>
  import("./CodeEditor").then((m) => ({ default: m.CodeEditor as EditorControl }))
);
const MarkdownEditor: EditorControl = lazy(() =>
  import("./MarkdownEditor").then((m) => ({
    default: m.MarkdownEditor as EditorControl,
  }))
);

/*
 * "switch" is deliberately absent — `SwitchField` renders the track inline with its own
 * label, hint and error, and never goes through a control from this map.
 */
const BY_KIND: Partial<Record<EditorKind, EditorControl>> = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput,
  date: DateInput,
  time: TimeInput,
  textarea: TextArea,
  markdown: MarkdownEditor,
  code: CodeEditor,
} as Partial<Record<EditorKind, EditorControl>>;

export function editorComponentFor(
  editor: EditorKind | undefined
): EditorControl | null {
  return (editor && BY_KIND[editor]) ?? null;
}

/**
 * Rich editors carry their own chrome, so the plain-input classes must not layer on top —
 * and they are the code-split ones, so rendering them needs a `<Suspense>` boundary.
 */
export function isRichEditor(editor: EditorKind | undefined): boolean {
  return editor === "markdown" || editor === "code";
}

/**
 * Consumer `editorProps`, split so `className` can be merged rather than spread.
 *
 * Spread after the registry's own `className` key it would replace the whole merged
 * string, stripping the border, focus ring and the `aria-invalid` styling exactly when
 * validation fails.
 */
export function splitEditorProps(editorProps?: Record<string, unknown>): {
  editorClassName: string | undefined;
  inputProps: Record<string, unknown>;
} {
  const { className, ...inputProps } = editorProps ?? {};
  return { editorClassName: className as string | undefined, inputProps };
}
