import type { Control } from "react-hook-form";
import type { WithMeta } from "../../types/column";
import type { FormFieldGroup } from "../../types/formLayout";
import { getAccessorKey } from "../../utils/getAccessorKey";
import { FieldCell } from "./FieldCell";
import { colSpanClass, gridColsClass, type FormColumns } from "./formGrid";

/* A native <legend> notches itself out of the fieldset border — no pseudo-element needed. */
const groupLabelClass =
  "ml-0.5 px-1.5 text-[.625rem] font-bold uppercase tracking-[.06em] text-muted";

/* Each field its own filled chip, flowed rather than gridded. Filled rather than
   bordered: the section's own border already contains them, and a second outline inside
   it reads as a box in a box. The `hover:` sits inside the child selector; outside it,
   variants stack outermost-first and one chip's hover would tint every sibling. */
const cardsClass =
  "flex flex-wrap gap-[10px_14px] [&>*]:min-w-0 [&>*]:flex-[0_1_260px] [&>*]:rounded-control [&>*]:bg-surface-inset [&>*]:px-[11px] [&>*]:py-[9px] [&>*]:transition-colors [&>*]:hover:bg-[color-mix(in_srgb,var(--rui-text-body)_7%,var(--rui-surface-inset))]";

type GroupSectionProps<TRow extends object, TForm extends object> = {
  group: FormFieldGroup;
  fields: WithMeta<TRow, TForm>[];
  control: Control<TForm>;
  idPrefix: string;
  gap: string;
  /** Columns of the form grid this section sits in. */
  formColumns: FormColumns;
  dirtyKeys?: ReadonlySet<string>;
};

/** One captioned section of the form, holding a grid of its own. */
export function GroupSection<TRow extends object, TForm extends object>({
  group,
  fields,
  control,
  idPrefix,
  gap,
  formColumns,
  dirtyKeys,
}: GroupSectionProps<TRow, TForm>) {
  const groupSpan = group.groupSpan ?? "full";
  /* A group keeps the form's column rhythm: as many inner columns as it spans, so a
     half-width section stays readable instead of squeezing the full count into half. */
  const columns = group.columns ?? (groupSpan === "full" ? formColumns : groupSpan);
  const cards = group.variant === "cards";

  return (
    /* `min-w-0` undoes the fieldset's `min-inline-size: min-content`, which would
       otherwise refuse to shrink and blow the form grid past its track. */
    <fieldset
      data-form-group={group.id}
      className={`min-w-0 rounded-surface border border-border-default px-3.5 pb-3.5 ${
        group.label ? "pt-2" : "pt-3.5"
      } ${colSpanClass(groupSpan)} ${group.className || ""}`}
    >
      {group.label && <legend className={groupLabelClass}>{group.label}</legend>}

      <div className={cards ? cardsClass : `grid ${gridColsClass(columns)} ${gap}`}>
        {fields.map((field) => (
          <FieldCell
            key={getAccessorKey(field) || field.id}
            field={field}
            control={control}
            idPrefix={idPrefix}
            dirtyKeys={dirtyKeys}
            variant={cards ? "cards" : "grid"}
          />
        ))}
      </div>
    </fieldset>
  );
}
