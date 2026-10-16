import { useEffect, useMemo, useRef } from "react";
import type { ZodType } from "zod";

import type { WithMeta } from "../types/column";
import { computeDefaults, getAccessorKey } from "../utils/getAccessorKey";
import { getPath } from "../utils/objectPath";
import { useEditForm } from "./useEditForm";
import { useFormError } from "./useFormError";
import { getColId } from "./useGridColumns";

type Params<TRow extends object, TForm extends object> = {
  row?: TRow;
  /** Create mode: values the form starts from, over the column defaults. */
  seed?: object;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  /** TanStack ids of the visible leaf columns, in table order (`getVisibleLeafColumns`). */
  visibleColumnIds: readonly string[];
  onSubmit: (
    values: TForm,
    meta: { dirtyKeys: ReadonlySet<string> }
  ) => void | Promise<void>;
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

const isBlank = (v: unknown) => v === undefined || v === null || v === "";

/**
 * The form behind a row in session: `useEditForm` with the field list split by where
 * the field is rendered.
 *
 * `editable` holds the columns that get an editor in their cell: `meta.editor`, an
 * accessor key, `visibleInForm !== false`, and a place among `visibleColumnIds`, in
 * that order. Every other editor column with an accessor key is `carried`: its value is
 * in the form (the row's value on edit, the default then the seed on create) and is
 * submitted untouched, but nothing on screen shows it. A tree's parent key travels this
 * way on create.
 *
 * Column ids and accessor keys are different vocabularies (`user_name` / `user.name`):
 * visibility is matched by id, `carried` names accessor keys.
 */
export function useRowEditForm<TRow extends object, TForm extends object>({
  row,
  seed,
  columns,
  zodSchema,
  visibleColumnIds,
  onSubmit,
  onSubmittingChange,
}: Params<TRow, TForm>) {
  const base = useEditForm<TRow, TForm>({
    row,
    seed,
    columns,
    zodSchema,
    onSubmit,
    onSubmittingChange,
  });
  const { form } = base;

  const { editable, carried } = useMemo(() => {
    const order = new Map(visibleColumnIds.map((id, i) => [id, i] as const));
    const shown: { col: WithMeta<TRow, TForm>; at: number }[] = [];
    const hidden: string[] = [];
    for (const c of columns) {
      const key = getAccessorKey(c);
      if (!key || !c.meta?.editor) continue;
      const at = c.meta.visibleInForm === false ? undefined : order.get(getColId(c));
      if (at === undefined) hidden.push(key);
      else shown.push({ col: c, at });
    }
    shown.sort((a, b) => a.at - b.at);
    return { editable: shown.map((s) => s.col), carried: hidden };
  }, [columns, visibleColumnIds]);

  /*
   * A required carried key with no value on create blocks the save while nothing on
   * screen turns red. Said once per form: the consumer gives the column a default, a
   * seed, or a place in the table.
   */
  const warned = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || warned.current || row) return;
    const defaults = computeDefaults(undefined, columns, seed);
    const blank = columns.filter((c) => {
      const key = getAccessorKey(c);
      return (
        key &&
        c.meta?.required &&
        carried.includes(key) &&
        isBlank(getPath(defaults, key))
      );
    });
    if (blank.length === 0) return;
    warned.current = true;
    console.warn(
      `[DataGrid] Required column(s) ${blank
        .map((c) => `'${getAccessorKey(c)}'`)
        .join(", ")} are not visible in the table and start empty, so the row cannot be ` +
        "saved. Give each a `meta.default`, a create seed, or a visible column."
    );
  }, [row, seed, columns, carried]);

  /* The error strip reports keys with no editor in the row, which is the carried set,
     not the drawer form's unrendered fields. */
  const { errors, isDirty } = form.formState;
  const formError = useFormError<TRow, TForm>(errors, editable);

  return {
    form,
    submit: base.submit,
    isSubmitting: base.isSubmitting,
    /** Any field differs from the form's defaults; what refuses another session. */
    isDirty,
    formError,
    dirtyKeys: base.dirtyKeys,
    /** Columns rendered as editors in the row, in table order. */
    editable,
    /** Accessor keys submitted without an editor in the row. */
    carried,
  };
}
