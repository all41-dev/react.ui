import type { ZodTypeAny } from "zod";
import type { WithMeta } from "../../types/column";
import { EditFormBody, getRowId, type FormLayoutConfig } from "./EditFormBody";

type EditInlineProps<TRow extends object, TForm extends object> = {
  open: boolean;
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodTypeAny;
  formLayout?: FormLayoutConfig;
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
};

/*
 * Not memoized. It receives `columns` (frequently an inline array) and an inline
 * `onCancel`, so a shallow compare failed every single time — the wrapper was pure
 * overhead advertising an optimization that never happened.
 */
export function EditInline<TRow extends object, TForm extends object>({
  open,
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: EditInlineProps<TRow, TForm>) {
  if (!open) return null;

  const formKey = mode === "edit" ? `edit-${getRowId(row)}` : "create";

  return (
    <EditFormBody<TRow, TForm>
      key={formKey}
      mode={mode}
      row={row}
      columns={columns}
      zodSchema={zodSchema}
      formLayout={formLayout}
      onCancel={onCancel}
      onSubmit={onSubmit}
      variant="inline"
    />
  );
}
