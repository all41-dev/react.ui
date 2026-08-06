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

/**
 * `.og-sec` + `.og-cap` + `.og-swrow` — switches get their own captioned section, each
 * one a bordered card. A bare `flex-wrap gap-6` of naked toggles gave no indication
 * where one option ended and the next began.
 *
 * Module scope, not a closure inside the form: a component created during render is a
 * new type every render, so React unmounts and remounts the whole subtree each time.
 */
function OptionsSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-[9px]">
      <h4 className="flex items-center gap-2 text-[.625rem] font-bold uppercase tracking-[.06em] text-faint after:h-px after:flex-1 after:bg-[color-mix(in_srgb,var(--rui-border-default)_80%,transparent)] after:content-['']">
        Options
      </h4>
      <div className="flex flex-wrap gap-[10px_14px] [&>*]:min-w-0 [&>*]:flex-[0_1_260px] [&>*]:rounded-control [&>*]:border [&>*]:border-border-default [&>*]:bg-surface-card [&>*]:px-[11px] [&>*]:py-[9px] [&>*]:transition-colors hover:[&>*]:border-border-translucent">
        {children}
      </div>
    </section>
  );
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
  /** Id for the form heading, so the overlay shell's aria-labelledby points at a real element. */
  titleId?: string;
  /** Reports react-hook-form's isSubmitting up, so the shell can refuse Esc/scrim mid-save. */
  onSubmittingChange?: (isSubmitting: boolean) => void;
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
  titleId,
  onSubmittingChange,
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

  React.useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);

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

  const isInline = variant === "inline";

  /*
   * One button vocabulary across all four containers. They used to differ by variant in
   * radius, padding, weight and shadow for no reason anyone could point at, and two of
   * the three cancel buttons had no border colour at all (Tailwind 4's bare `border` is
   * `currentColor`).
   */
  const cancelBtnClass =
    "cursor-pointer rounded-control border border-border-default bg-surface-card px-3 py-1.5 text-[.8125rem] text-body transition-colors hover:border-border-translucent hover:bg-surface-raised disabled:opacity-50";

  const submitBtnClass =
    "cursor-pointer rounded-control bg-accent px-3 py-1.5 text-[.8125rem] font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50";

  // `.og-eroot` — a danger-tinted band, sized to the form's own type scale.
  const serverErrorClass =
    "flex items-start gap-2 rounded-control border border-[color-mix(in_srgb,var(--rui-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--rui-danger)_12%,transparent)] px-[11px] py-[9px] text-[.75rem] text-danger";


  // Inline variant renders differently (flat form without header)
  if (isInline) {
    return (
      <FormProvider {...(form as unknown as UseFormReturn)}>
        {/* `.og-ipanel` — the inline form's own body/footer bands. */}
        <form onSubmit={submit} className="w-full">
          <div className="flex flex-col gap-4 px-4 pb-4 pt-3.5">
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
              <OptionsSection>
                {switchFields.map((c) => (
                  <div key={(c as any).accessorKey || c.id}>
                    {renderEditor<TForm>({
                      column: c as any,
                      control: (form as any).control,
                    })}
                  </div>
                ))}
              </OptionsSection>
            )}

            {formError && (
              <p className={serverErrorClass} role="alert">
                {formError}
              </p>
            )}
          </div>

          {/* `.og-ifoot` — a 3% wash over the card surface, so the actions read as a
              footer without introducing a fourth surface token. */}
          <div className="flex items-center justify-end gap-2 border-t border-border-default bg-[color-mix(in_srgb,var(--rui-text-body)_3%,var(--rui-surface-card))] px-3.5 py-[11px]">
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
              {isSubmitting ? <SavingLabel /> : "Save"}
            </button>
          </div>
        </form>
      </FormProvider>
    );
  }

  /*
   * Drawer / modal / sheet: header band, scrolling body, footer band.
   *
   * The actions used to sit INSIDE the scrolling area, so on a long form Save scrolled
   * out of sight. `.og-ehead` / `.og-ebody` / `.og-efoot` are three flex children —
   * only the middle one scrolls.
   */
  return (
    <FormProvider {...(form as unknown as UseFormReturn)}>
      <form onSubmit={submit} className="flex h-full min-h-0 flex-col">
        <div className="flex flex-none items-center gap-[9px] border-b border-border-default px-4 py-[13px]">
          <h3 id={titleId} className="text-[.9375rem] font-semibold text-body">
            {mode === "edit" ? "Edit" : "Create"}
          </h3>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4 scrollbar">
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
            <OptionsSection>
              {switchFields.map((c) => (
                <div key={(c as any).accessorKey || c.id}>
                  {renderEditor<TForm>({
                    column: c as any,
                    control: (form as any).control,
                  })}
                </div>
              ))}
            </OptionsSection>
          )}

          {formError && (
            <p className={serverErrorClass} role="alert">
              {formError}
            </p>
          )}
        </div>

        {/* `.og-efoot` */}
        <div className="flex flex-none items-center justify-end gap-2 border-t border-border-default bg-surface-inset px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={cancelBtnClass}
          >
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className={submitBtnClass}>
            {isSubmitting ? <SavingLabel /> : "Save"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

/** Spinner + label for the pending Save button, shared by every container. */
function SavingLabel() {
  return (
    <span className="flex items-center gap-2">
      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" aria-hidden>
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
        />
        <path
          className="opacity-75"
          d="M4 12a8 8 0 018-8"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
        />
      </svg>
      Saving…
    </span>
  );
}

export const EditFormBody = React.memo(EditFormBodyInner) as typeof EditFormBodyInner;
