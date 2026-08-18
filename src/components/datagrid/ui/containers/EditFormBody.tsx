import { FormProvider, type UseFormReturn } from "react-hook-form";
import type { ZodType } from "zod";
import type { WithMeta } from "../../types/column";
import { useEditForm } from "../../hooks/useEditForm";
import type { FormLayoutConfig } from "../../types/formLayout";
import { FormFields } from "./FormFields";
import { FormActions } from "./FormActions";

export type { FormFieldGroup, FormLayoutConfig } from "../../types/formLayout";

/**
 * Fallback id from a row object's conventional keys. Only a last resort: the containers
 * key the form with the grid's own `rowKey` (resolved through `idAccessor`) when they
 * have one — rows keyed by a custom accessor have neither `id` nor `uuid`.
 */
export function getRowId<T>(row?: T) {
  const r = row as { id?: string | number; uuid?: string } | undefined;
  return r?.id ?? r?.uuid ?? "";
}

type EditFormBodyProps<TRow extends object, TForm extends object> = {
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
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
  const { form, submit, isSubmitting, formError, blocks, dirtyKeys } = useEditForm<
    TRow,
    TForm
  >({
    row,
    columns,
    zodSchema,
    onSubmit,
    groups: formLayout?.groups,
    onSubmittingChange,
  });

  /* Built once, then placed into whichever wrapper the variant calls for. */
  const fieldsContent = (
    <FormFields<TRow, TForm>
      blocks={blocks}
      control={form.control}
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
