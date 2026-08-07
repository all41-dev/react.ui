import type { Control } from "react-hook-form";
import type { WithMeta } from "../../types/column";
import { getAccessorKey } from "../../utils/getAccessorKey";
import { renderEditor } from "../editors/EditorRegistry";
import { Field, FormLayout } from "./FormLayout";
import React from "react";

export type FormLayoutConfig = {
  columns?: 1 | 2 | 3 | 4;
  gap?: string;
  className?: string;
};

// A danger-tinted band, sized to the form's own type scale.
const serverErrorClass =
  "flex items-start gap-2 rounded-control border border-[color-mix(in_srgb,var(--rui-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--rui-danger)_12%,transparent)] px-[11px] py-[9px] text-[.75rem] text-danger";

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

type FormFieldsProps<TRow extends object, TForm extends object> = {
  regularFields: WithMeta<TRow, TForm>[];
  switchFields: WithMeta<TRow, TForm>[];
  control: Control<TForm>;
  formLayout?: FormLayoutConfig;
  formError?: string;
  dirtyKeys?: ReadonlySet<string>;
};

/**
 * The form's field content: laid-out editors, the switches in their own section, then
 * the server error. Shared by every variant — only the wrapper around it differs.
 */
export function FormFields<TRow extends object, TForm extends object>({
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
          control={control}
          columns={formLayout?.columns}
          gap={formLayout?.gap}
          className={formLayout?.className}
          dirtyKeys={dirtyKeys}
        />
      )}

      {switchFields.length > 0 && (
        <OptionsSection>
          {switchFields.map((c) => {
            const key = getAccessorKey(c);
            return (
              // The same wrapper the laid-out fields use, so a toggled switch gets the
              // "changed" badge and not just the CSS bar.
              <Field key={key || c.id} changed={!!key && !!dirtyKeys?.has(key)}>
                {renderEditor({ column: c, control })}
              </Field>
            );
          })}
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
