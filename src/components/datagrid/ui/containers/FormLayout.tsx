import type { Control } from "react-hook-form";
import type { FormBlock } from "../../utils/formBlocks";
import { getAccessorKey } from "../../utils/getAccessorKey";
import { FieldCell } from "./FieldCell";
import { gridColsClass, type FormColumns } from "./formGrid";
import { GroupSection } from "./GroupSection";

type FormLayoutProps<TRow extends object, TForm extends object> = {
  /** Fields and groups in display order — see `buildFormBlocks`. */
  blocks: FormBlock<TRow, TForm>[];
  control: Control<TForm>;
  /** Per-form prefix for every field's DOM id — see `renderEditor`. */
  idPrefix: string;
  columns?: FormColumns;
  gap?: string;
  className?: string;
  /** Accessor keys the user has actually changed, marked while the form is open. */
  dirtyKeys?: ReadonlySet<string>;
};

/**
 * The form grid. Loose fields are cells in it; a group is one cell holding a grid of its
 * own, so `colSpan` is always relative to the field's own group and `groupSpan` to the
 * form.
 */
export function FormLayout<TRow extends object, TForm extends object>({
  blocks,
  control,
  idPrefix,
  columns = 2,
  gap = "gap-4",
  className = "",
  dirtyKeys,
}: FormLayoutProps<TRow, TForm>) {
  return (
    <div className={`grid ${gridColsClass(columns)} ${gap} ${className}`}>
      {blocks.map((block) =>
        /* Group ids and accessor keys are separate namespaces: a column named `options`
           beside the implicit Options section would otherwise collide. */
        block.kind === "field" ? (
          <FieldCell
            key={`field:${getAccessorKey(block.field) || block.field.id}`}
            field={block.field}
            control={control}
            idPrefix={idPrefix}
            dirtyKeys={dirtyKeys}
          />
        ) : (
          <GroupSection
            key={`group:${block.group.id}`}
            group={block.group}
            fields={block.fields}
            control={control}
            idPrefix={idPrefix}
            gap={gap}
            formColumns={columns}
            dirtyKeys={dirtyKeys}
          />
        )
      )}
    </div>
  );
}
