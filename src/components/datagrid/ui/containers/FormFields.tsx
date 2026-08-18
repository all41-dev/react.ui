import { useId } from "react";
import type { Control } from "react-hook-form";
import type { FormLayoutConfig } from "../../types/formLayout";
import type { FormBlock } from "../../utils/formBlocks";
import { FormLayout } from "./FormLayout";

export type { FormLayoutConfig } from "../../types/formLayout";

// A danger-tinted band, sized to the form's own type scale.
const serverErrorClass =
  "flex items-start gap-2 rounded-control border border-[color-mix(in_srgb,var(--rui-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--rui-danger)_12%,transparent)] px-[11px] py-[9px] text-[.75rem] text-danger";

type FormFieldsProps<TRow extends object, TForm extends object> = {
  blocks: FormBlock<TRow, TForm>[];
  control: Control<TForm>;
  formLayout?: FormLayoutConfig;
  formError?: string;
  dirtyKeys?: ReadonlySet<string>;
};

/**
 * The form's field content: the laid-out editors, then the server error. Shared by every
 * variant — only the wrapper around it differs.
 */
export function FormFields<TRow extends object, TForm extends object>({
  blocks,
  control,
  formLayout,
  formError,
  dirtyKeys,
}: FormFieldsProps<TRow, TForm>) {
  /* Field names are the caller's accessor keys, so two grids on one page both own a
     field called `name`. Everything the editors put in the DOM hangs off this prefix.
     Colons are legal in an id but break any selector built from it. */
  const idPrefix = useId().replace(/:/g, "_");

  return (
    <>
      {blocks.length > 0 && (
        <FormLayout
          blocks={blocks}
          control={control}
          idPrefix={idPrefix}
          columns={formLayout?.columns}
          gap={formLayout?.gap}
          className={formLayout?.className}
          dirtyKeys={dirtyKeys}
        />
      )}

      {formError && (
        <p className={serverErrorClass} role="alert">
          {formError}
        </p>
      )}
    </>
  );
}
