import type { FieldValues } from "react-hook-form";
import type { ZodType } from "zod";
import type { WithMeta } from "../../types/column";
import { EditDrawerRight } from "./EditDrawerRight";

/**
 * Bottom sheet = same form, different container chrome.
 * Reuse EditDrawerRight's EditForm by importing the component file.
 * We just change the outer wrapper.
 */
export function EditDrawerBottom<
  TRow extends object,
  TForm extends FieldValues
>({
  open,
  mode,
  row,
  columns,
  zodSchema,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
}) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 w-full transform bg-white shadow-2xl transition-transform duration-300 ${
        open ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {open && (
        <div className="mx-auto w-full max-w-5xl">
          <EditDrawerRight<TRow, TForm>
            open={true}
            mode={mode}
            row={row}
            columns={columns}
            zodSchema={zodSchema}
            onCancel={onCancel}
            onSubmit={onSubmit}
          />
        </div>
      )}
    </div>
  );
}
