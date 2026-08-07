import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import type { WithMeta } from "../types/column";
import { computeDefaults, getAccessorKey } from "../utils/getAccessorKey";
import { getApiMessage } from "../../../api/errors";

type Params<TRow extends object, TForm extends object> = {
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  onSubmit: (values: TForm) => void | Promise<void>;
  /** Reports react-hook-form's isSubmitting up, so a shell can refuse Esc mid-save. */
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

/**
 * Everything react-hook-form about the edit form: setup, submit with the `fromForm`
 * round-trip and server-error capture, the fields partitioned for layout, and the
 * dirty-key set. `EditFormBody` keeps only the markup around it.
 */
export function useEditForm<TRow extends object, TForm extends object>({
  row,
  columns,
  zodSchema,
  onSubmit,
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

  const formError = useMemo(() => {
    const serverMsg = errors.root?.server?.message;
    if (serverMsg) return serverMsg;

    const errKeys = Object.keys(errors);
    if (!errKeys.length) return undefined;

    const fieldKeys = new Set(
      fields.map((c) => getAccessorKey(c)).filter(Boolean)
    );
    const unrenderedErrors = errKeys.filter((k) => !fieldKeys.has(k));

    if (unrenderedErrors.length > 0) {
      const firstKey = unrenderedErrors[0];
      // `FieldErrors` is keyed by the form shape; errors for unrendered keys are read
      // through a plain record view.
      const byKey = errors as Record<string, { message?: string } | undefined>;
      const msg = byKey[firstKey]?.message || "Invalid value";
      return `Validation error on '${firstKey}': ${msg}`;
    }

    return undefined;
  }, [errors, fields]);

  const submit = form.handleSubmit(
    async (values) => {
      const out = { ...values } as Record<string, unknown>;
      for (const c of fields) {
        const key = getAccessorKey(c);
        if (!key || !c.meta?.fromForm) continue;
        out[key] = c.meta.fromForm(out[key], values);
      }
      try {
        await onSubmit(out as TForm);
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
      // Surface validation failures so they're visible to the user
      console.warn("[DataGrid] Form validation failed:", validationErrors);
    }
  );

  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => {
      const orderA = a.meta?.formLayout?.order ?? 999;
      const orderB = b.meta?.formLayout?.order ?? 999;
      return orderA - orderB;
    });
  }, [fields]);

  const regularFields = useMemo(
    () => sortedFields.filter((c) => c.meta?.editor !== "switch"),
    [sortedFields]
  );
  const switchFields = useMemo(
    () => sortedFields.filter((c) => c.meta?.editor === "switch"),
    [sortedFields]
  );

  /*
   * Which fields the user actually touched. `dirtyFields` compares against the form's
   * defaults, so typing a value and putting the original back clears the mark — it
   * tracks real changes rather than "was focused".
   *
   * Rebuilt every render on purpose. react-hook-form mutates this object in place, so
   * memoising on its identity pinned the set to whatever the FIRST dirty field was and
   * every later change went unmarked. It is a handful of keys — recomputing is cheaper
   * than getting it wrong.
   */
  const dirtyKeys = new Set(
    Object.entries(dirtyFields)
      .filter(([, v]) => !!v)
      .map(([k]) => k)
  );

  return {
    form,
    submit,
    isSubmitting,
    formError,
    regularFields,
    switchFields,
    dirtyKeys,
  };
}
