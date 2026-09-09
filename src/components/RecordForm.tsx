import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from "react";
import { FormProvider, type UseFormReturn } from "react-hook-form";
import type { ZodType } from "zod";

import { useEditForm } from "./datagrid/hooks/useEditForm";
import type { WithMeta } from "./datagrid/types/column";
import type { FormLayoutConfig } from "./datagrid/types/formLayout";
import { FormActions } from "./datagrid/ui/containers/FormActions";
import { FormFields } from "./datagrid/ui/containers/FormFields";
import { GridTooltip } from "./datagrid/ui/GridTooltip";
import { TooltipIdContext } from "./datagrid/ui/tooltipContext";

export type RecordFormProps<TRow extends object, TForm extends object> = {
  /** The record under edit. Omit to create one. Read once at mount; a new object later does not reseed the fields. */
  row?: TRow;
  /** The same column declarations a `DataGrid` takes; only those with an `editor` become fields. */
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  formLayout?: FormLayoutConfig;
  /** Receives the schema's output and the accessor keys the user actually changed. A throw keeps the form open and shows the message. */
  onSubmit: (
    values: TForm,
    meta: { dirtyKeys: ReadonlySet<string> }
  ) => void | Promise<void>;
  onCancel: () => void;
  /** Heading of the form; "Edit" or "Create" when omitted. */
  title?: ReactNode;
  /** DOM id of the `<form>` — what a disclosure control's `aria-controls` points at. */
  id?: string;
  className?: string;
  /** Rendered above the fields, inside the scrolling body: server-written columns, a note. */
  intro?: ReactNode;
  /** Moves focus to the first editable control on mount. */
  autoFocus?: boolean;
  /** True while any field differs from what the form opened on; false again on unmount. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Reports react-hook-form's isSubmitting up. */
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"]';

/**
 * The grid's edit form on its own: a heading with Cancel and Save, then the fields, in a
 * host of the consumer's choosing — a band under a bar, a panel, a card. Same columns,
 * schema, groups, hints and editors as `DataGrid`, without a grid around them.
 *
 * Height follows the host: inside a height-capped flex column the field body scrolls and
 * the heading with its actions stays put. Escape cancels and Ctrl/⌘+S saves while focus
 * is inside the form, unless the control under focus already consumed the key.
 */
export function RecordForm<TRow extends object, TForm extends object>({
  row,
  columns,
  zodSchema,
  formLayout,
  onSubmit,
  onCancel,
  title,
  id,
  className = "",
  intro,
  autoFocus = false,
  onDirtyChange,
  onSubmittingChange,
}: RecordFormProps<TRow, TForm>) {
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

  const baseId = useId().replace(/:/g, "_");
  const titleId = `${baseId}-title`;
  const tooltipId = `${baseId}-tip`;
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = dirtyKeys.size > 0;
  const reportDirty = useEffectEvent((next: boolean) => onDirtyChange?.(next));
  useEffect(() => {
    reportDirty(dirty);
  }, [dirty]);
  /* A form that goes away takes its draft with it; the consumer's flag must follow. */
  useEffect(() => () => reportDirty(false), []);

  useEffect(() => {
    if (!autoFocus) return;
    formRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [autoFocus]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.defaultPrevented) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (!isSubmitting) onCancel();
      return;
    }
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <TooltipIdContext.Provider value={tooltipId}>
      <FormProvider {...(form as unknown as UseFormReturn)}>
        <form
          ref={formRef}
          id={id}
          onSubmit={submit}
          onKeyDown={onKeyDown}
          aria-labelledby={titleId}
          className={`flex min-h-0 flex-col ${className}`}
        >
          <div className="flex flex-none items-center gap-2 border-b border-border-default px-4 py-2">
            <h3 id={titleId} className="min-w-0 truncate text-[.8125rem] font-semibold text-body">
              {title ?? (row ? "Edit" : "Create")}
            </h3>
            <div className="ml-auto flex flex-none items-center gap-2">
              <FormActions onCancel={onCancel} isSubmitting={isSubmitting} />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4 scrollbar">
            {intro}
            <FormFields<TRow, TForm>
              blocks={blocks}
              control={form.control}
              formLayout={formLayout}
              formError={formError}
              dirtyKeys={dirtyKeys}
            />
          </div>
        </form>
      </FormProvider>
      <GridTooltip id={tooltipId} />
    </TooltipIdContext.Provider>
  );
}
