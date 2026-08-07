import type { ZodType } from "zod";
import type { WithMeta } from "../types/column";
import type { useEditSession } from "../hooks/useEditSession";
import { EditContainer, type EditContainerKind } from "./containers/EditContainers";
import type { FormLayoutConfig } from "./containers/EditFormBody";
import { CellEditPopover } from "./table/CellEditPopover";

type GridEditorsProps<TRow extends object, TForm extends object> = {
  effectiveContainer: EditContainerKind;
  inlineEditing: boolean;
  edit: ReturnType<typeof useEditSession<TRow>>;
  /** The grid's resolved identity for the row under edit — keys the form remount. */
  editingRowKey: string | number | undefined;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  formLayout?: FormLayoutConfig;
  onSubmit: (values: TForm) => void | Promise<void>;
  cellEditColumn: WithMeta<TRow, TForm> | undefined;
  onCellSave: (value: unknown) => Promise<void>;
};

/**
 * The editors that live OUTSIDE the body: the overlay form (drawer/modal/sheet) and the
 * single-cell popover. The inline form is not here — it renders inside the table body,
 * so `DataGrid` hands it to `GridBody` instead.
 */
export function GridEditors<TRow extends object, TForm extends object>({
  effectiveContainer,
  inlineEditing,
  edit,
  editingRowKey,
  columns,
  zodSchema,
  formLayout,
  onSubmit,
  cellEditColumn,
  onCellSave,
}: GridEditorsProps<TRow, TForm>) {
  return (
    <>
      {!inlineEditing && (
        <EditContainer<TRow, TForm>
          kind={effectiveContainer}
          open={edit.isFormOpen}
          mode={edit.formMode}
          row={edit.editingRow}
          rowKey={editingRowKey}
          columns={columns}
          zodSchema={zodSchema}
          formLayout={formLayout}
          onCancel={edit.close}
          onSubmit={onSubmit}
        />
      )}

      {edit.cell && cellEditColumn && (
        <CellEditPopover<TRow, TForm>
          state={edit.cell}
          column={cellEditColumn}
          onCancel={edit.close}
          onSave={onCellSave}
        />
      )}
    </>
  );
}
