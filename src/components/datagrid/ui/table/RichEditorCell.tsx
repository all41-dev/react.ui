import { Pencil } from "lucide-react";
import { useCallback, useState, type MouseEvent } from "react";
import {
  useController,
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormReturn,
} from "react-hook-form";

import type { CellAnchor } from "../../hooks/useEditSession";
import type { EditorKind, WithMeta } from "../../types/column";
import { CellFieldError } from "../editors/CellFieldError";
import { cellErrorTooltipProps } from "../editors/editorChrome";
import { isRichEditor } from "../editors/editorComponents";
import { useTooltipId } from "../tooltipContext";
import { CellEditPopover } from "./CellEditPopover";

/** Editors with no 28px form: inside a row they edit through the popover. */
export function editsInPopover(editor: EditorKind | undefined): boolean {
  return editor === "textarea" || isRichEditor(editor);
}

const toText = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const BUTTON =
  "flex h-7 w-full cursor-text items-center gap-1.5 rounded-control border border-transparent px-1.5 text-left text-[.8125rem] text-body outline-none transition-[border-color,box-shadow] hover:border-border-translucent hover:bg-surface-inset focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]";
const INVALID = "border-danger ring-1 ring-danger/40";

/**
 * A textarea, markdown or code field inside a row in session. The cell shows the form's
 * current value on one line with a pencil; activating it opens `CellEditPopover` on the
 * field, and Save writes back into the row form — dirty, not persisted. The row's own
 * save carries the value like any other.
 *
 * The button is the field's control in the row: it carries the error ring, the tooltip
 * and `aria-describedby`, and `data-rich-editor` puts it in the row's focus order.
 */
export function RichEditorCell<TRow extends object, TForm extends FieldValues>({
  column,
  name,
  form,
  fieldId,
  label,
  row,
}: {
  column: WithMeta<TRow, TForm>;
  name: Path<TForm>;
  form: UseFormReturn<TForm>;
  fieldId: string;
  label: string;
  /** What the popover is told it edits: the row on edit, the seed on a draft. */
  row: TRow;
}) {
  const tooltipId = useTooltipId();
  const { field, fieldState } = useController({ control: form.control, name });
  const [anchor, setAnchor] = useState<CellAnchor | null>(null);

  const hasError = !!fieldState.error;
  const errorMsg = fieldState.error?.message;

  const open = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setAnchor({ top: r.top, bottom: r.bottom, left: r.left, width: r.width });
  };
  const close = useCallback(() => setAnchor(null), []);

  const save = useCallback(
    async (value: unknown) => {
      form.setValue(name, value as PathValue<TForm, Path<TForm>>, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setAnchor(null);
    },
    [form, name]
  );

  return (
    <>
      <button
        type="button"
        id={fieldId}
        data-rich-editor
        aria-label={`Edit ${label}`}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${fieldId}-error` : undefined}
        onClick={open}
        className={hasError ? `${BUTTON} ${INVALID}` : BUTTON}
        {...cellErrorTooltipProps(tooltipId, errorMsg)}
      >
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          {toText(field.value)}
        </span>
        <Pencil className="h-3 w-3 shrink-0 text-faint" aria-hidden />
      </button>
      <CellFieldError id={`${fieldId}-error`} message={errorMsg} />
      {anchor && (
        <CellEditPopover<TRow, TForm>
          state={{ row, columnId: String(name), anchor }}
          column={column}
          seed={{ value: field.value }}
          onCancel={close}
          onSave={save}
        />
      )}
    </>
  );
}
