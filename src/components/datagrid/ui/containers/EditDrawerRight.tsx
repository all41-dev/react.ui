import type { ZodTypeAny } from "zod";
import type { WithMeta } from "../../types/column";
import { EditFormBody, getRowId, type FormLayoutConfig } from "./EditFormBody";

export function EditDrawerRight<TRow extends object, TForm extends object>({
  open,
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodTypeAny;
  formLayout?: FormLayoutConfig;
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
}) {
  const formKey = mode === "edit" ? `edit-${getRowId(row)}` : "create";

  return (
    <div
      className={`fixed right-0 top-0 z-40 h-full w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {open && (
        <EditFormBody<TRow, TForm>
          key={formKey}
          mode={mode}
          row={row}
          columns={columns}
          zodSchema={zodSchema}
          formLayout={formLayout}
          onCancel={onCancel}
          onSubmit={onSubmit}
          variant="drawer"
        />
      )}
    </div>
  );
}
