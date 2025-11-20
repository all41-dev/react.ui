import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";
import type { WithMeta } from "../../types/column";
import { computeDefaults } from "../../utils/getAccessorKey";
import { renderEditor } from "../editors/EditorRegistry";
import { useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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

  const submit = form.handleSubmit(async (values) => {
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
  });

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancel, isSubmitting]);

  // Sort all fields by order, including switches
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
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div className="mt-auto flex items-center justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-md border px-4 py-2 text-sm disabled:opacity-60 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-60 hover:bg-gray-800"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
}

export function EditModal<TRow extends object, TForm extends object>({
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

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 p-4"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
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
      </div>
    </div>,
    document.body
  );
}
