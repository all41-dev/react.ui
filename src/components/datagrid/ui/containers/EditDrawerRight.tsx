import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import type { WithMeta } from "../../types/column";
import { computeDefaults } from "../../utils/getAccessorKey";
import { useMemo } from "react";
import { FormLayout } from "./FormLayout";

function getRowId<T>(row?: T) {
  return (row as any)?.id ?? (row as any)?.uuid ?? "";
}

function EditFormBody<TRow extends object, TForm extends object>({
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodTypeAny;
  formLayout?: {
    columns?: 1 | 2 | 3 | 4;
    gap?: string;
    className?: string;
  };
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
}) {
  const initialDefaults = useMemo(
    () =>
      mode === "edit" ? (computeDefaults as any)(row, columns) : ({} as any),
    [mode, row, columns]
  );

  const form = useForm<TForm>({
    resolver: zodResolver(zodSchema as any),
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

  const { isSubmitting, errors } = form.formState;
  const serverError = (errors as any)?.root?.server?.message as
    | string
    | undefined;

  const submit = form.handleSubmit(
    async (values) => {
      const out: any = { ...values };
      for (const c of fields) {
        const key = (c as any).accessorKey as keyof TForm | undefined;
        if (!key) continue;
        if (c.meta?.parse)
          out[key] = c.meta.parse((values as any)[key], values as TForm);
      }
      try {
        await onSubmit(out as TForm);
        form.clearErrors("root.server" as any);
      } catch (e: any) {
        const message =
          e?.response?.data?.message ??
          e?.message ??
          "Save failed. Please check the fields and try again.";
        form.setError("root.server" as any, { type: "server", message });
      }
    },
    () => {}
  );

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
          <FormLayout
            fields={fields}
            control={(form as any).control}
            columns={formLayout?.columns}
            gap={formLayout?.gap}
            className={formLayout?.className}
          />

          {serverError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="mt-auto flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-md border px-3 py-2 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-black px-3 py-2 text-white disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}

export function EditDrawerRight<TRow extends object, TForm extends object>({
  open,
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodTypeAny;
  formLayout?: {
    columns?: 1 | 2 | 3 | 4;
    gap?: string;
    className?: string;
  };
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
}) {
  const formKey = mode === "edit" ? `edit-${getRowId(row)}` : "create";

  return (
    <div
      className={`fixed right-0 top-0 z-40 h-full w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {open && (
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
      )}
    </div>
  );
}
