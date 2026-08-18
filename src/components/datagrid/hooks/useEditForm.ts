import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import type { WithMeta } from "../types/column";
import type { FormFieldGroup } from "../types/formLayout";
import { buildFormBlocks } from "../utils/formBlocks";
import { applyFromForm, computeDefaults } from "../utils/getAccessorKey";
import { flattenPaths } from "../utils/objectPath";
import { useFormError } from "./useFormError";
import { getApiMessage } from "../../../api/errors";

type Params<TRow extends object, TForm extends object> = {
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  onSubmit: (values: TForm) => void | Promise<void>;
  /** Section declarations from `formLayout.groups`. */
  groups?: FormFieldGroup[];
  /** Reports react-hook-form's isSubmitting up, so a shell can refuse Esc mid-save. */
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

/**
 * Everything react-hook-form about the edit form: setup, submit with the `fromForm`
 * round-trip and server-error capture, the fields blocked out for layout, and the
 * dirty-key set. `EditFormBody` keeps only the markup around it.
 */
export function useEditForm<TRow extends object, TForm extends object>({
  row,
  columns,
  zodSchema,
  onSubmit,
  groups,
  onSubmittingChange,
}: Params<TRow, TForm>) {
  const initialDefaults = useMemo(
    () => computeDefaults(row, columns),
    [row, columns]
  );

  /*
   * Pre-created so it's not rebuilt during render. The cast is the one deliberate
   * escape hatch in the form stack: the public prop types the schema by its OUTPUT
   * (`ZodType<TForm>`), while the resolver's overloads want the input side too.
   */
  const resolver = useMemo(
    () => zodResolver(zodSchema as unknown as ZodType<TForm, TForm>),
    [zodSchema]
  );

  const form = useForm<TForm>({
    resolver,
    defaultValues: initialDefaults,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const fields = useMemo(
    () =>
      columns.filter(
        (c) => c.meta?.visibleInForm !== false && !!c.meta?.editor
      ),
    [columns]
  );

  /* `dirtyFields` has to be read off formState here for react-hook-form to subscribe to
     it — destructuring is the subscription. */
  const { isSubmitting, errors, dirtyFields } = form.formState;

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

  const formError = useFormError<TRow, TForm>(errors, fields);

  const submit = form.handleSubmit(
    async (values) => {
      // Over every column, not just the rendered fields — the cell-edit commit converts
      // the same set, and `fromForm` describes storage rather than the form UI.
      const out = applyFromForm(values, columns);
      try {
        await onSubmit(out);
        form.clearErrors("root.server");
      } catch (e) {
        const message = getApiMessage(
          e,
          "Save failed. Please check the fields and try again."
        );
        form.setError("root.server", {
          type: "server",
          message,
        });
      }
    },
    (validationErrors) => {
      /* Development only. The messages are already rendered on the fields, and these
         error objects carry DOM refs that have no business in a consumer's console. */
      if (import.meta.env.DEV) {
        console.warn("[DataGrid] Form validation failed:", validationErrors);
      }
    }
  );

  const blocks = useMemo(
    () => buildFormBlocks(fields, groups),
    [fields, groups]
  );

  /*
   * Which fields the user actually touched. `dirtyFields` compares against the form's
   * defaults, so typing a value and putting the original back clears the mark — it
   * tracks real changes rather than "was focused".
   *
   * Flattened to dotted paths, because react-hook-form nests by field path: a dirty
   * `user.name` arrives as `{ user: { name: true } }`, while the layout asks
   * `dirtyKeys.has("user.name")`.
   *
   * Rebuilt every render on purpose — don't memoize on `dirtyFields`. react-hook-form
   * mutates that object in place, so its identity never changes and the set would pin to
   * whatever the first dirty field was. It is a handful of keys.
   */
  const dirtyKeys = new Set(
    flattenPaths(dirtyFields, { isLeaf: (node) => node === true })
  );

  return {
    form,
    submit,
    isSubmitting,
    formError,
    blocks,
    dirtyKeys,
  };
}
