import type { Control, FieldValues, Path } from "react-hook-form";

import type { WithMeta } from "../../types/column";
import type { FormGroupVariant } from "../../types/formLayout";
import { getAccessorKey } from "../../utils/getAccessorKey";
import {
  editorComponentFor,
  isRichEditor,
  splitEditorProps,
} from "./editorComponents";
import { PlainEditorField } from "./PlainEditorField";
import { SwitchController } from "./SwitchController";

export function renderEditor<TRow extends object, TForm extends FieldValues>(opts: {
  column: WithMeta<TRow, TForm>;
  control: Control<TForm>;
  /**
   * Per-form prefix for the DOM ids. Field names are the caller's accessor keys, so two
   * grids on one page both own a field called `name` — bare ids would collide and every
   * `<label htmlFor>` and `aria-describedby` would resolve to the first form on the page.
   */
  idPrefix: string;
  /** Variant of the section the field sits in; only the switch lays itself out from it. */
  variant?: FormGroupVariant;
}) {
  const { column, control, idPrefix, variant } = opts;
  // Columns are keyed by the row type while the form is keyed by the form type; this is
  // the one place that bridge is cast.
  const name = getAccessorKey(column) as Path<TForm> | undefined;
  if (!name) return null;
  const fieldId = `${idPrefix}-${String(name)}`;

  const meta = column.meta ?? {};
  const label = meta.label ?? String(column.header ?? name);
  const { editorClassName, inputProps } = splitEditorProps(meta.editorProps);

  if (meta.editor === "switch") {
    return (
      <div key={String(name)}>
        <SwitchController
          control={control}
          name={name}
          id={fieldId}
          label={label}
          required={meta.required}
          description={meta.description}
          hint={meta.hint}
          inputProps={inputProps}
          variant={variant}
        />
      </div>
    );
  }

  const Field = editorComponentFor(meta.editor);
  if (!Field) return null;

  return (
    <div key={String(name)} className="space-y-1.5">
      <PlainEditorField
        control={control}
        name={name}
        fieldId={fieldId}
        label={label}
        meta={meta}
        editor={meta.editor}
        isRich={isRichEditor(meta.editor)}
        Field={Field}
        editorClassName={editorClassName}
        inputProps={inputProps}
      />
    </div>
  );
}
