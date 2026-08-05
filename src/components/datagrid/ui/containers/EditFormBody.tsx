import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import type { WithMeta } from "../../types/column";
import { computeDefaults } from "../../utils/getAccessorKey";
import { renderEditor } from "../editors/EditorRegistry";
import { useMemo } from "react";
import { FormLayout } from "./FormLayout";
import { getApiMessage } from "../../../../api/errors";
import React from "react";

/** Shared helper – returns a stable id from a row object. */
export function getRowId<T>(row?: T) {
  return (row as any)?.id ?? (row as any)?.uuid ?? "";
}

export type FormLayoutConfig = {
  columns?: 1 | 2 | 3 | 4;
  gap?: string;
  className?: string;
};

type EditFormBodyProps<TRow extends object, TForm extends object> = {
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodTypeAny;
  formLayout?: FormLayoutConfig;
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
  /** Visual variant – controls minor styling differences between containers. */
  variant?: "inline" | "drawer" | "modal";
};

function EditFormBodyInner<TRow extends object, TForm extends object>({
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
  variant = "drawer",
}: EditFormBodyProps<TRow, TForm>) {
  const initialDefaults = useMemo(
    () => (computeDefaults as any)(row, columns) as TForm,
    [row, columns]
  );

  // Pre-create resolver so it's not re-created during render
  const resolver = useMemo(() => zodResolver(zodSchema as any), [zodSchema]);

  const form = useForm<TForm>({
    resolver,
    defaultValues: initialDefaults as any,
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

  const { isSubmitting, errors } = form.formState;

  const formError = useMemo(() => {
    const serverMsg = (errors as any)?.root?.server?.message as
      | string
      | undefined;
    if (serverMsg) return serverMsg;

    const errKeys = Object.keys(errors);
    if (!errKeys.length) return undefined;

    const fieldKeys = new Set(
      fields.map((c) => (c as any).accessorKey as string).filter(Boolean)
    );
    const unrenderedErrors = errKeys.filter((k) => !fieldKeys.has(k));

    if (unrenderedErrors.length > 0) {
      const firstKey = unrenderedErrors[0];
      const msg = (errors as any)[firstKey]?.message || "Invalid value";
      return `Validation error on '${firstKey}': ${msg}`;
    }

    return undefined;
  }, [errors, fields]);

  const submit = form.handleSubmit(
    async (values) => {
      const out: any = { ...values };
      for (const c of fields) {
        const key = (c as any).accessorKey as keyof TForm | undefined;
        if (!key) continue;
        if (c.meta?.parse)
          out[key] = c.meta.parse(
            (values as any)[key],
            values as unknown as TForm
          );
      }
      try {
        await onSubmit(out as TForm);
        form.clearErrors("root.server" as any);
      } catch (e: any) {
        const message = getApiMessage(
          e,
          "Save failed. Please check the fields and try again."
        );
        form.setError("root.server" as any, {
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

  // Variant-specific class names
  const isInline = variant === "inline";
  const actionsContainerClass = isInline
    ? "flex items-center justify-end gap-3 px-4 py-3 border-t border-border-default bg-gradient-to-r from-surface-inset to-surface-card"
    : variant === "modal"
    ? "mt-auto flex items-center justify-end gap-2 pt-2 border-t"
    : "mt-auto flex items-center justify-end gap-2 pt-2";

  const cancelBtnClass = isInline
    ? "cursor-pointer rounded-lg border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-body shadow-sm disabled:opacity-50 hover:bg-surface-inset hover:border-accent transition-all duration-200"
    : variant === "modal"
    ? "cursor-pointer rounded-md border px-4 py-2 text-sm disabled:opacity-60 hover:bg-surface-inset"
    : "cursor-pointer rounded-md border px-3 py-2 disabled:opacity-60";

  const submitBtnClass = isInline
    ? "cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-contrast shadow-sm disabled:opacity-50 hover:bg-accent-hover hover:shadow-md transition-all duration-200"
    : variant === "modal"
    ? "cursor-pointer rounded-md bg-accent px-4 py-2 text-sm text-accent-contrast disabled:opacity-60 hover:bg-accent-hover"
    : "cursor-pointer rounded-md bg-accent px-3 py-2 text-accent-contrast disabled:opacity-60 hover:bg-accent-hover";

  const serverErrorClass = isInline
    ? "rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger shadow-sm"
    : "rounded-md border border-danger/30 bg-danger/10 p-2 text-sm text-danger";

  // Inline variant renders differently (flat form without header)
  if (isInline) {
    return (
      <FormProvider {...(form as unknown as UseFormReturn)}>
        <form onSubmit={submit} className="w-full">
          <div className="p-4 space-y-4">
            {regularFields.length > 0 && (
              <FormLayout
                fields={regularFields}
                control={(form as any).control}
                columns={formLayout?.columns}
                gap={formLayout?.gap}
                className={formLayout?.className}
              />
            )}

            {switchFields.length > 0 && (
              <div className="flex flex-wrap items-start gap-6 pt-2 border-t border-border-default">
                {switchFields.map((c) => (
                  <div key={(c as any).accessorKey || c.id}>
                    {renderEditor<TForm>({
                      column: c as any,
                      control: (form as any).control,
                    })}
                  </div>
                ))}
              </div>
            )}

            {formError && (
              <div className={serverErrorClass}>
                <div className="flex items-start gap-2">
                  <svg
                    className="h-5 w-5 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 
                      1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 
                      11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 
                      10l1.293-1.293a1 1 0 00-1.414-1.414L10 
                      8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{formError}</span>
                </div>
              </div>
            )}
          </div>

          <div className={actionsContainerClass}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className={cancelBtnClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={submitBtnClass}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 
                      0 5.373 0 12h4zm2 5.291A7.962 7.962 0 
                      014 12H0c0 3.042 1.135 5.824 3 
                      7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving…
                </span>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </FormProvider>
    );
  }

  // Drawer / Modal variant: includes header + scrollable form area
  return (
    <FormProvider {...(form as unknown as UseFormReturn)}>
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold">
            {mode === "edit" ? "Edit" : "Create"}
          </h3>
        </div>

        <form
          onSubmit={submit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
        >
          {regularFields.length > 0 && (
            <FormLayout
              fields={regularFields}
              control={(form as any).control}
              columns={formLayout?.columns}
              gap={formLayout?.gap}
              className={formLayout?.className}
            />
          )}

          {switchFields.length > 0 && (
            <div className="flex flex-wrap items-start gap-6 pt-2 border-t border-border-default">
              {switchFields.map((c) => (
                <div key={(c as any).accessorKey || c.id}>
                  {renderEditor<TForm>({
                    column: c as any,
                    control: (form as any).control,
                  })}
                </div>
              ))}
            </div>
          )}

          {formError && (
            <div className={serverErrorClass}>
              {formError}
            </div>
          )}

          <div className={actionsContainerClass}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className={cancelBtnClass}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={submitBtnClass}
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}

export const EditFormBody = React.memo(EditFormBodyInner) as typeof EditFormBodyInner;
