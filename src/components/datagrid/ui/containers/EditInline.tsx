import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import type { WithMeta } from "../../types/column";
import { computeDefaults } from "../../utils/getAccessorKey";
import { renderEditor } from "../editors/EditorRegistry";
import { useMemo } from "react";
import { FormLayout } from "./FormLayout";
import React from "react";

function getRowId<T>(row?: T) {
  return (row as any)?.id ?? (row as any)?.uuid ?? "";
}

type FormLayoutConfig = {
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
};

function EditFormBodyInner<TRow extends object, TForm extends object>({
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: EditFormBodyProps<TRow, TForm>) {
  const initialDefaults = useMemo(
    () =>
      mode === "edit"
        ? ((computeDefaults as any)(row, columns) as TForm)
        : ({} as TForm),
    [mode, row, columns]
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
  const serverError = (errors as any)?.root?.server?.message as
    | string
    | undefined;

  const submit = form.handleSubmit(async (values) => {
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
      const message =
        e?.response?.data?.message ??
        e?.message ??
        "Save failed. Please check the fields and try again.";
      form.setError("root.server" as any, {
        type: "server",
        message,
      });
    }
  });

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

  return (
    <FormProvider {...(form as unknown as UseFormReturn)}>
      <form onSubmit={submit} className="w-full">
        <div className="p-4 space-y-4">
          {/* Regular fields in grid */}
          {regularFields.length > 0 && (
            <FormLayout
              fields={regularFields}
              control={(form as any).control}
              columns={formLayout?.columns}
              gap={formLayout?.gap}
              className={formLayout?.className}
            />
          )}

          {/* Switch fields in a horizontal row */}
          {switchFields.length > 0 && (
            <div className="flex flex-wrap items-start gap-6 pt-2 border-t border-gray-200">
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

          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50/80 p-3 text-sm text-red-700 shadow-sm">
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
                <span>{serverError}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50/80 to-white">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm disabled:opacity-50 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 hover:bg-gray-800 hover:shadow-md transition-all duration-200"
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

const EditFormBody = React.memo(EditFormBodyInner) as typeof EditFormBodyInner;

type EditInlineProps<TRow extends object, TForm extends object> = {
  open: boolean;
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodTypeAny;
  formLayout?: FormLayoutConfig;
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
};

function EditInlineInner<TRow extends object, TForm extends object>({
  open,
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: EditInlineProps<TRow, TForm>) {
  if (!open) return null;

  const formKey = mode === "edit" ? `edit-${getRowId(row)}` : "create";

  return (
    <EditFormBody<TRow, TForm>
      key={formKey}
      mode={mode}
      row={row}
      columns={columns}
      zodSchema={zodSchema}
      formLayout={formLayout}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  );
}

export const EditInline = React.memo(EditInlineInner) as typeof EditInlineInner;
