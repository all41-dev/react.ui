import type { WithMeta } from "../types/column";
import { OPTIONS_GROUP_ID, type FormFieldGroup } from "../types/formLayout";

/** One item of the form grid: a loose field, or a group with the fields it holds. */
export type FormBlock<TRow extends object, TForm extends object> =
  | { kind: "field"; field: WithMeta<TRow, TForm> }
  | {
      kind: "group";
      group: FormFieldGroup;
      fields: WithMeta<TRow, TForm>[];
    };

/** Where a field with no `order` lands: after everything that declares one. */
const DEFAULT_ORDER = 999;
/** Keeps the implicit Options group at the bottom whatever the fields around it order to. */
const LAST = Number.MAX_SAFE_INTEGER;

const fieldOrder = <TRow extends object, TForm extends object>(
  field: WithMeta<TRow, TForm>
) => field.meta?.formLayout?.order ?? DEFAULT_ORDER;

/** Switches with no group of their own collect into the implicit Options section. */
const groupIdOf = <TRow extends object, TForm extends object>(
  field: WithMeta<TRow, TForm>
) =>
  field.meta?.formLayout?.group ??
  (field.meta?.editor === "switch" ? OPTIONS_GROUP_ID : undefined);

const resolveGroup = (
  id: string,
  declared: FormFieldGroup | undefined
): FormFieldGroup => {
  const base: FormFieldGroup =
    id === OPTIONS_GROUP_ID
      ? { id, label: "Options", variant: "cards", order: LAST }
      : { id, label: id };
  /* `order` merges by value rather than by key: a declared group carrying an explicit
     `order: undefined` must not knock the Options section out of last place. */
  return { ...base, ...declared, order: declared?.order ?? base.order };
};

/**
 * Partitions the form's fields into the blocks the layout renders, in display order.
 *
 * Fields sort by `meta.formLayout.order` first, so a group takes the position of its
 * earliest field unless it declares an `order` of its own. Both sorts are stable, which
 * leaves anything without an `order` in column declaration order.
 */
export function buildFormBlocks<TRow extends object, TForm extends object>(
  fields: WithMeta<TRow, TForm>[],
  groups: FormFieldGroup[] = []
): FormBlock<TRow, TForm>[] {
  const declared = new Map(groups.map((g) => [g.id, g]));
  const blocks: FormBlock<TRow, TForm>[] = [];
  const openGroups = new Map<
    string,
    Extract<FormBlock<TRow, TForm>, { kind: "group" }>
  >();

  const sorted = [...fields].sort((a, b) => fieldOrder(a) - fieldOrder(b));

  sorted.forEach((field) => {
    const id = groupIdOf(field);
    if (!id) {
      blocks.push({ kind: "field", field });
      return;
    }

    let block = openGroups.get(id);
    if (!block) {
      block = { kind: "group", group: resolveGroup(id, declared.get(id)), fields: [] };
      openGroups.set(id, block);
      blocks.push(block);
    }
    block.fields.push(field);
  });

  const blockOrder = (block: FormBlock<TRow, TForm>) =>
    block.kind === "field"
      ? fieldOrder(block.field)
      : block.group.order ?? fieldOrder(block.fields[0]);

  return blocks.sort((a, b) => blockOrder(a) - blockOrder(b));
}
