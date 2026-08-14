import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import type { WithMeta } from "../../types/column";
import { getAccessorKey } from "../../utils/getAccessorKey";
import {
  editorComponentFor,
  isRichEditor,
  splitEditorProps,
} from "./editorComponents";
import { FieldChrome } from "./FieldChrome";
import { SwitchController } from "./SwitchController";
import { buildDescribedBy, buildEditorClassName } from "./editorChrome";

export function renderEditor<TRow extends object, TForm extends FieldValues>(opts: {
  column: WithMeta<TRow, TForm>;
  control: Control<TForm>;
  /**
   * Per-form prefix for the DOM ids. Field names are the caller's accessor keys, so two
   * grids on one page both own a field called `name` — bare ids would collide and every
   * `<label htmlFor>` and `aria-describedby` would resolve to the first form on the page.
   */
  idPrefix: string;
}) {
  const { column, control, idPrefix } = opts;
  // Columns are keyed by the row type while the form is keyed by the form type; this is
  // the one place that bridge is cast.
  const name = getAccessorKey(column) as Path<TForm> | undefined;
  if (!name) return null;
  const fieldId = `${idPrefix}-${String(name)}`;

  const meta = column.meta ?? {};
  const label = meta.label ?? String(column.header ?? name);
  const description = meta.description;
  const editor = meta.editor;

  const { editorClassName, inputProps } = splitEditorProps(meta.editorProps);

  if (editor === "switch") {
    return (
      <div key={String(name)}>
        <SwitchController
          control={control}
          name={name}
          id={fieldId}
          label={label}
          description={description}
          inputProps={inputProps}
        />
      </div>
    );
  }

  const Field = editorComponentFor(editor);
  if (!Field) return null;
  const isRich = isRichEditor(editor);

  return (
    <div key={String(name)} className="space-y-1.5">
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => {
          const hasError = !!fieldState.error;
          const errorMsg = fieldState.error?.message;

          const forwarded: Record<string, unknown> = {
            id: fieldId,
            "aria-invalid": hasError || undefined,
            "aria-describedby": buildDescribedBy({
              id: fieldId,
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
            ...inputProps,
          };

          if (editor === "select") {
            forwarded.options = meta.options ?? [];
          }

          return (
            <FieldChrome
              id={fieldId}
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
