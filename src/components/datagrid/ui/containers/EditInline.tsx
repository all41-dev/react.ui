import type { ZodType } from "zod";
import type { WithMeta } from "../../types/column";
import { EditFormBody, formKeyOf, type FormLayoutConfig } from "./EditFormBody";

type EditInlineProps<TRow extends object, TForm extends object> = {
  open: boolean;
  mode: "create" | "edit";
  row?: TRow;
  /** The grid's resolved row identity — see `OverlayEditContainerProps.rowKey`. */
  rowKey?: string | number;
  /** Create mode: values the form starts from, over the column defaults. */
  seed?: object;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  formLayout?: FormLayoutConfig;
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
};

/* Deliberately not memoized: `columns` and `onCancel` are usually inline, so a shallow
   compare would never match and we'd pay for it every render. */
export function EditInline<TRow extends object, TForm extends object>({
  open,
  mode,
  row,
  rowKey,
  seed,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: EditInlineProps<TRow, TForm>) {
  if (!open) return null;

  const formKey = formKeyOf(mode, rowKey, row, seed);

  return (
    <EditFormBody<TRow, TForm>
      key={formKey}
      mode={mode}
      row={row}
      seed={seed}
      columns={columns}
      zodSchema={zodSchema}
      formLayout={formLayout}
      onCancel={onCancel}
      onSubmit={onSubmit}
      variant="inline"
    />
  );
}
