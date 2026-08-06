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
 * Switches get their own captioned section, each one a bordered card, so it's clear
 * where one option ends and the next begins.
 *
 * Module scope rather than a closure inside the form: a component defined during render
 * is a new type each time, and React remounts the whole subtree.
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

/* One button style across all four containers. Note the explicit border colour — a bare
   `border` in Tailwind 4 resolves to `currentColor`. */
const cancelBtnClass =
  "cursor-pointer rounded-control border border-border-default bg-surface-card px-3 py-1.5 text-[.8125rem] text-body transition-colors hover:border-border-translucent hover:bg-surface-raised disabled:opacity-50";

const submitBtnClass =
  "cursor-pointer rounded-control bg-accent px-3 py-1.5 text-[.8125rem] font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50";

// A danger-tinted band, sized to the form's own type scale.
const serverErrorClass =
  "flex items-start gap-2 rounded-control border border-[color-mix(in_srgb,var(--rui-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--rui-danger)_12%,transparent)] px-[11px] py-[9px] text-[.75rem] text-danger";

type FormFieldsProps<TRow extends object, TForm extends object> = {
  regularFields: WithMeta<TRow, TForm>[];
  switchFields: WithMeta<TRow, TForm>[];
  control: unknown;
  formLayout?: FormLayoutConfig;
  formError?: string;
  dirtyKeys?: ReadonlySet<string>;
};

/**
 * The form's field content: laid-out editors, the switches in their own section, then
 * the server error. Shared by every variant — only the wrapper around it differs.
 */
function FormFields<TRow extends object, TForm extends object>({
  regularFields,
  switchFields,
  control,
  formLayout,
  formError,
  dirtyKeys,
}: FormFieldsProps<TRow, TForm>) {
  return (
    <>
      {regularFields.length > 0 && (
        <FormLayout
          fields={regularFields}
          control={control as any}
          columns={formLayout?.columns}
          gap={formLayout?.gap}
          className={formLayout?.className}
          dirtyKeys={dirtyKeys}
        />
      )}

      {switchFields.length > 0 && (
        <OptionsSection>
          {switchFields.map((c) => (
            <div
              key={(c as any).accessorKey || c.id}
              className="rui-field relative"
              data-changed={
                dirtyKeys?.has((c as any).accessorKey) ? "true" : undefined
              }
            >
              {renderEditor<TForm>({
                column: c as any,
                control: control as any,
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
    </>
  );
}

/** Cancel + Save. Same in every variant; only the band around them differs. */
function FormActions({
  onCancel,
  isSubmitting,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  return (
    <>
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
    </>
  );
}

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

/* Deliberately not memoized: `columns`, `onCancel` and `onSubmit` are usually inline,
   so a shallow compare would never match and we'd pay for it every render. */
export function EditFormBody<TRow extends object, TForm extends object>({
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

  /* `dirtyFields` has to be read off formState here for react-hook-form to subscribe to
     it — destructuring is the subscription. */
  const { isSubmitting, errors, dirtyFields } = form.formState;

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
        if (c.meta?.fromForm)
          out[key] = c.meta.fromForm(
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

  /* Built once, then placed into whichever wrapper the variant calls for. */
  const fieldsContent = (
    <FormFields<TRow, TForm>
      regularFields={regularFields}
      switchFields={switchFields}
      control={(form as any).control}
      formLayout={formLayout}
      formError={formError}
      dirtyKeys={dirtyKeys}
    />
  );
  const actionsContent = (
    <FormActions onCancel={onCancel} isSubmitting={isSubmitting} />
  );

  // Inline variant renders differently (flat form without header)
  if (variant === "inline") {
    return (
      <FormProvider {...(form as unknown as UseFormReturn)}>
        <form onSubmit={submit} className="w-full">
          <div className="flex flex-col gap-4 px-4 pb-4 pt-3.5">{fieldsContent}</div>

          {/* A faint wash over the card surface, so the actions read as a footer
              without needing another surface token. */}
          <div className="flex items-center justify-end gap-2 border-t border-border-default bg-[color-mix(in_srgb,var(--rui-text-body)_3%,var(--rui-surface-card))] px-3.5 py-[11px]">
            {actionsContent}
          </div>
        </form>
      </FormProvider>
    );
  }

  /*
   * Drawer / modal / sheet: header, scrolling body, footer. Three flex children where
   * only the middle one scrolls, which keeps Save in view on a long form.
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
          {fieldsContent}
        </div>

        <div className="flex flex-none items-center justify-end gap-2 border-t border-border-default bg-surface-inset px-4 py-3">
          {actionsContent}
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
