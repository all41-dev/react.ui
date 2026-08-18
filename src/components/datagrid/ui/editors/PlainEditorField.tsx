import { Suspense, type ComponentType, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import type { ColumnMeta, EditorKind } from "../../types/column";
import { FieldChrome } from "./FieldChrome";
import { FieldHint } from "./FieldHint";
import { buildDescribedBy, buildEditorClassName } from "./editorChrome";

/** Placeholder at the rich editors' min height, so the form keeps its layout. */
function EditorSkeleton() {
  return (
    <div
      className="min-h-[118px] w-full animate-pulse rounded-control border border-border-default bg-surface-inset"
      aria-hidden
    />
  );
}

/**
 * Every editor except the switch: the control inside `FieldChrome`, bound to the form and
 * wired to its label, description, hint and error.
 */
export function PlainEditorField<TRow, TForm extends FieldValues>({
  control,
  name,
  fieldId,
  label,
  meta,
  editor,
  isRich,
  Field,
  editorClassName,
  inputProps,
}: {
  control: Control<TForm>;
  name: Path<TForm>;
  fieldId: string;
  label: ReactNode;
  meta: ColumnMeta<TRow, TForm>;
  editor: EditorKind | undefined;
  isRich: boolean;
  Field: ComponentType<Record<string, unknown>>;
  editorClassName: string | undefined;
  inputProps: Record<string, unknown> | undefined;
}) {
  const { description, hint, required } = meta;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const hasError = !!fieldState.error;

        /* `inputProps` goes first: the accessibility wiring below is derived from the
           column meta and the live field state, so a consumer's `editorProps` must not
           be able to overwrite it. `splitEditorProps` protects `className` the same way. */
        const forwarded: Record<string, unknown> = {
          ...inputProps,
          id: fieldId,
          "aria-invalid": hasError || undefined,
          "aria-describedby": buildDescribedBy({
            id: fieldId,
            description,
            hasError,
            hasHint: !!hint && !hasError,
          }),
          "aria-required": required || undefined,
          className: buildEditorClassName({
            editor,
            isRich,
            hasError,
            editorClassName,
          }),
        };

        if (editor === "select") {
          forwarded.options = meta.options ?? [];
        }

        const input = (
          <Field {...forwarded} value={field.value ?? ""} onChange={field.onChange} />
        );

        return (
          <FieldChrome
            id={fieldId}
            label={label}
            required={required}
            description={description}
            hasError={hasError}
            errorMsg={fieldState.error?.message}
            hint={
              hint && (
                <FieldHint
                  id={`${fieldId}-hint`}
                  control={control}
                  value={field.value}
                  hint={hint}
                />
              )
            }
          >
            {/* The rich editors are code-split, so they need a boundary; the fallback
                holds the field's height so the form doesn't jump as one arrives. */}
            {isRich ? (
              <Suspense fallback={<EditorSkeleton />}>{input}</Suspense>
            ) : (
              input
            )}
          </FieldChrome>
        );
      }}
    />
  );
}
