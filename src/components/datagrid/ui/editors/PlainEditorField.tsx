import { Suspense, type ComponentType } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import type { ColumnMeta, EditorKind } from "../../types/column";
import { useTooltipId } from "../tooltipContext";
import { CellFieldError } from "./CellFieldError";
import { FieldChrome } from "./FieldChrome";
import { FieldHint } from "./FieldHint";
import {
  buildDescribedBy,
  buildEditorClassName,
  cellErrorTooltipProps,
  type EditorVariant,
} from "./editorChrome";

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
 *
 * The `"cell"` variant drops the chrome: the label becomes the control's `aria-label`,
 * description and hint are not rendered, and the error is a ring on the control plus a
 * tooltip over it, described through an sr-only span.
 */
export function PlainEditorField<TRow extends object, TForm extends FieldValues>({
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
  variant,
}: {
  control: Control<TForm>;
  name: Path<TForm>;
  fieldId: string;
  label: string;
  meta: ColumnMeta<TRow, TForm>;
  editor: EditorKind | undefined;
  isRich: boolean;
  Field: ComponentType<Record<string, unknown>>;
  editorClassName: string | undefined;
  inputProps: Record<string, unknown> | undefined;
  variant?: EditorVariant;
}) {
  const inCell = variant === "cell";
  const { required } = meta;
  const description = inCell ? undefined : meta.description;
  const hint = inCell ? undefined : meta.hint;
  const tooltipId = useTooltipId();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const hasError = !!fieldState.error;
        const errorMsg = fieldState.error?.message;

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
            variant,
          }),
        };

        if (inCell) {
          forwarded["aria-label"] = label;
          Object.assign(forwarded, cellErrorTooltipProps(tooltipId, errorMsg));
        }

        if (editor === "select") {
          forwarded.options = meta.options ?? [];
        }

        const rendered = (
          <Field {...forwarded} value={field.value ?? ""} onChange={field.onChange} />
        );
        /* The rich editors are code-split, so they need a boundary; the fallback holds
           the field's height so the form doesn't jump as one arrives. */
        const input = isRich ? (
          <Suspense fallback={<EditorSkeleton />}>{rendered}</Suspense>
        ) : (
          rendered
        );

        if (inCell) {
          return (
            <>
              {input}
              <CellFieldError id={`${fieldId}-error`} message={errorMsg} />
            </>
          );
        }

        return (
          <FieldChrome
            id={fieldId}
            label={label}
            required={required}
            description={description}
            hasError={hasError}
            errorMsg={errorMsg}
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
            {input}
          </FieldChrome>
        );
      }}
    />
  );
}
