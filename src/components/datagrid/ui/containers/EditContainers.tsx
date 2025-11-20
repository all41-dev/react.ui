import type { ZodType } from "zod";
import type { WithMeta } from "../../types/column";
import { EditDrawerRight } from "./EditDrawerRight";
import { EditModal } from "./EditModal";

export type EditContainerKind =
  | "right"
  | "bottom"
  | "modal"
  | "inline"
  | "none";

export function EditContainer<
  TRow extends object,
  TForm extends object = TRow
>({
  kind,
  open,
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: {
  kind: EditContainerKind;
  open: boolean;
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  formLayout?: {
    columns?: 1 | 2 | 3 | 4;
    gap?: string;
    className?: string;
  };
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
}) {
  if (kind === "none" || kind === "inline") return null;

  const props = {
    open,
    mode,
    row,
    columns,
    zodSchema,
    formLayout,
    onCancel,
    onSubmit,
  };

  if (kind === "right") return <EditDrawerRight<TRow, TForm> {...props} />;
  if (kind === "modal") return <EditModal<TRow, TForm> {...props} />;
  // if (kind === "bottom") return <EditDrawerBottom<TRow, TForm> {...props} />;

  return null;
}
