import { Fragment } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

import type { WithMeta } from "../../types/column";
import { getAccessorKey } from "../../utils/getAccessorKey";
import type { EditorVariant } from "./editorChrome";
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
  /**
   * Where the field renders. A section variant only decides how the switch lays itself
   * out; `"cell"` renders every editor without its chrome, for a table cell.
   */
  variant?: EditorVariant;
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
  const inCell = variant === "cell";

  if (meta.editor === "switch") {
    const switchField = (
      <SwitchController
        control={control}
        name={name}
        id={fieldId}
        label={label}
        required={meta.required}
        /* A cell shows neither. Dropped here rather than in the field so the hint's
           form-wide subscription is never mounted for a row of switches. */
        description={inCell ? undefined : meta.description}
        hint={inCell ? undefined : meta.hint}
        inputProps={inputProps}
        variant={variant}
      />
    );
    return inCell ? (
      <Fragment key={String(name)}>{switchField}</Fragment>
    ) : (
      <div key={String(name)}>{switchField}</div>
    );
  }

  const Field = editorComponentFor(meta.editor);
  if (!Field) return null;

  const plainField = (
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
      variant={variant}
    />
  );

  /* A cell gets the control alone: a wrapper between the cell and the input would take
     the cell's width and alignment rules away from it. */
  return inCell ? (
    <Fragment key={String(name)}>{plainField}</Fragment>
  ) : (
    <div key={String(name)} className="space-y-1.5">
      {plainField}
    </div>
  );
}
