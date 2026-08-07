import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import type { ComponentType } from "react";
import type { WithMeta } from "../../types/column";
import { getAccessorKey } from "../../utils/getAccessorKey";
import { TextInput } from "../inputs/TextInput";
import { NumberInput } from "../inputs/NumberInput";
import { SelectInput } from "../inputs/SelectInput";
import { DateInput } from "../inputs/DateInput";
import { TimeInput } from "../inputs/TimeInput";
import { TextArea } from "../inputs/TextArea";
import { MarkdownEditor } from "./MarkdownEditor";
import { CodeEditor } from "./CodeEditor";
import { FieldChrome } from "./FieldChrome";
import { SwitchField } from "./SwitchField";
import { buildDescribedBy, buildEditorClassName } from "./editorChrome";

export function renderEditor<TRow extends object, TForm extends FieldValues>(opts: {
  column: WithMeta<TRow, TForm>;
  control: Control<TForm>;
}) {
  const { column, control } = opts;
  // Columns are keyed by the row type while the form is keyed by the form type; this is
  // the one place that bridge is cast.
  const name = getAccessorKey(column) as Path<TForm> | undefined;
  if (!name) return null;

  const meta = column.meta ?? {};
  const label = meta.label ?? String(column.header ?? name);
  const description = meta.description;
  const editor = meta.editor;

  /*
   * "switch" is deliberately absent from this map — `SwitchField` renders the track
   * inline with its own label, hint and error, and never reaches `Comp`.
   */
  const isSwitch = editor === "switch";

  const Comp =
    editor === "text"
      ? TextInput
      : editor === "number"
      ? NumberInput
      : editor === "select"
      ? SelectInput
      : editor === "date"
      ? DateInput
      : editor === "time"
      ? TimeInput
      : editor === "textarea"
      ? TextArea
      : editor === "markdown"
      ? MarkdownEditor
      : editor === "code"
      ? CodeEditor
      : null;

  // The switch branch supplies its own markup, so a missing `Comp` is only fatal for
  // every other editor kind.
  if (!Comp && !isSwitch) return null;
  // The editors take heterogeneous prop shapes; the registry hands each a prop bag.
  const Field = Comp as unknown as ComponentType<Record<string, unknown>>;

  // Rich editors carry their own chrome — the plain-input border/focus classes
  // must not be layered on top of them.
  const isRich = editor === "markdown" || editor === "code";

  return (
    <div key={String(name)} className={isSwitch ? "" : "space-y-1.5"}>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => {
          const hasError = !!fieldState.error;
          const errorMsg = fieldState.error?.message;

          /*
           * `className` is merged into the class string below, so it must not ride along
           * in the spread — spread after the `className` key it would replace the whole
           * merged string, stripping the border, focus ring and the `aria-invalid`
           * styling exactly when validation fails.
           */
          const { className: rawEditorClassName, ...restEditorProps } =
            meta.editorProps ?? {};
          const editorClassName = rawEditorClassName as string | undefined;

          if (isSwitch) {
            return (
              <SwitchField
                name={String(name)}
                label={label}
                description={description}
                checked={Boolean(field.value)}
                onChange={field.onChange}
                hasError={hasError}
                errorMsg={errorMsg}
                inputProps={restEditorProps}
              />
            );
          }

          const forwarded: Record<string, unknown> = {
            id: String(name),
            "aria-invalid": hasError || undefined,
            "aria-describedby": buildDescribedBy({
              name: String(name),
              description,
              hasError,
            }),
            "aria-required": meta.required || undefined,
            className: buildEditorClassName({
              editor,
              isRich,
              hasError,
              editorClassName,
            }),
            ...restEditorProps,
          };

          if (editor === "select") {
            forwarded.options = meta.options ?? [];
          }

          return (
            <FieldChrome
              name={String(name)}
              label={label}
              required={meta.required}
              description={description}
              hasError={hasError}
              errorMsg={errorMsg}
            >
              <Field
                {...forwarded}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            </FieldChrome>
          );
        }}
      />
    </div>
  );
}
