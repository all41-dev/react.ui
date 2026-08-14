import type { ComponentType } from "react";

import type { EditorKind } from "../../types/column";
import { DateInput } from "../inputs/DateInput";
import { NumberInput } from "../inputs/NumberInput";
import { SelectInput } from "../inputs/SelectInput";
import { TextArea } from "../inputs/TextArea";
import { TextInput } from "../inputs/TextInput";
import { TimeInput } from "../inputs/TimeInput";
import { CodeEditor } from "./CodeEditor";
import { MarkdownEditor } from "./MarkdownEditor";

/*
 * "switch" is deliberately absent — `SwitchField` renders the track inline with its own
 * label, hint and error, and never goes through a control from this map.
 *
 * The editors take heterogeneous prop shapes, so the registry hands each one a prop bag
 * rather than trying to unify them behind a single props type.
 */
const BY_KIND: Partial<
  Record<EditorKind, ComponentType<Record<string, unknown>>>
> = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput,
  date: DateInput,
  time: TimeInput,
  textarea: TextArea,
  markdown: MarkdownEditor,
  code: CodeEditor,
} as Partial<Record<EditorKind, ComponentType<Record<string, unknown>>>>;

export function editorComponentFor(
  editor: EditorKind | undefined
): ComponentType<Record<string, unknown>> | null {
  return (editor && BY_KIND[editor]) ?? null;
}

/** Rich editors carry their own chrome; the plain-input classes must not layer on top. */
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
