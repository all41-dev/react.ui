import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import type { WithMeta } from "../../types/column";
import { TextInput } from "../inputs/TextInput";
import { NumberInput } from "../inputs/NumberInput";
import { SelectInput } from "../inputs/SelectInput";
import { DateInput } from "../inputs/DateInput";
import { TimeInput } from "../inputs/TimeInput";
import { TextArea } from "../inputs/TextArea";
import { MarkdownEditor } from "./MarkdownEditor";
import { CodeEditor } from "./CodeEditor";

function getAccessorKey<T extends FieldValues>(
  c: WithMeta<T>
): Path<T> | undefined {
  return (c as any).accessorKey as Path<T> | undefined;
}

export function renderEditor<T extends FieldValues>(opts: {
  column: WithMeta<T>;
  control: Control<T, any, any>;
}) {
  const { column, control } = opts;
  const name = getAccessorKey<T>(column);
  if (!name) return null;

  const meta = column.meta ?? {};
  const label = meta.label ?? String(column.header ?? name);
  const description = meta.description;
  const editor = meta.editor;

  /*
   * "switch" is deliberately absent from this map: the branch further down renders the
   * spec's 38x21 track inline, along with its own label, hint and error, and never
   * reaches `Comp`. The `SwitchInput` that used to be mapped here was a plain 15px
   * checkbox that nothing could reach and that matched nothing in the design.
   */
  const isSwitch = editor === "switch";

  const Comp =
    editor === "text"
      ? TextInput
      : editor === "number"
      ? NumberInput
      : editor === "select"
      ? SelectInput
      : editor === "date"
      ? DateInput
      : editor === "time"
      ? TimeInput
      : editor === "textarea"
      ? TextArea
      : editor === "markdown"
      ? MarkdownEditor
      : editor === "code"
      ? CodeEditor
      : null;

  // The switch branch supplies its own markup, so a missing `Comp` is only fatal for
  // every other editor kind.
  if (!Comp && !isSwitch) return null;
  const Field = Comp as NonNullable<typeof Comp>;

  // Rich editors carry their own chrome — the plain-input border/focus classes
  // must not be layered on top of them.
  const isRich = editor === "markdown" || editor === "code";

  return (
    <div
      key={String(name)}
      className={editor === "switch" ? "" : "space-y-1.5"}
    >
      <Controller<T, any, any>
        control={control}
        name={name}
        render={({ field, fieldState }) => {
          const hasError = !!fieldState.error;
          const errorMsg = fieldState.error?.message as string | undefined;
          /*
           * `.og-in` — 32px on the INSET surface at the control radius. It was a 40px
           * `rounded-lg` field on the card surface, i.e. the same colour as the panel
           * behind it, so the field edge was doing all the work of saying "input".
           * `hover:border-accent` also went: hover is not a state a text field has.
           */
          const baseClass =
            "w-full h-8 rounded-control border border-border-default bg-surface-inset px-[9px] text-[.8125rem] text-body placeholder:text-faint transition-[border-color,box-shadow] focus:border-accent focus:ring-2 focus:ring-[var(--rui-focus-ring)] focus:outline-none";
          // `textarea.og-in` opts out of the fixed control height.
          const shapeClass =
            editor === "textarea"
              ? "!h-auto min-h-[74px] resize-y !py-2 leading-[1.5]"
              : "";

          const invalidClass = hasError
            ? "border-danger focus:border-danger focus:ring-[var(--rui-focus-ring)]"
            : "";

          // Ids for the hint and error text so the control can point at whichever is
          // showing. Without these, assistive tech reads the input with no indication
          // that it is invalid or why.
          // The hint is hidden while an error shows, so it must drop out of
          // `aria-describedby` too — pointing at a removed node describes nothing.
          const describedBy =
            [
              hasError ? `${String(name)}-error` : null,
              description && !hasError ? `${String(name)}-desc` : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined;

          const forwarded: any = {
            id: String(name),
            "aria-invalid": hasError || undefined,
            "aria-describedby": describedBy,
            "aria-required": meta.required || undefined,
            className: isRich
              ? (meta.editorProps as any)?.className
              : [baseClass, shapeClass, invalidClass, (meta.editorProps as any)?.className]
                  .filter(Boolean)
                  .join(" "),
            ...meta.editorProps,
          };

          // Switch fields - horizontal layout
          if (editor === "switch") {
            return (
              <div className="flex flex-col">
                <label
                  htmlFor={String(name)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  {/* `.og-sw` — a 38×21 track with a 15px knob, on the raised surface
                      with a translucent edge. The 44×24 default read as a mobile
                      toggle next to 32px fields. */}
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      id={String(name)}
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(e.target.checked)}
                      aria-invalid={hasError || undefined}
                      aria-describedby={hasError ? `${String(name)}-error` : undefined}
                      className="sr-only peer"
                      {...(meta.editorProps as any)}
                    />
                    <div className="h-[21px] w-[38px] rounded-full border border-border-translucent bg-surface-raised transition-[background-color,border-color] duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--rui-focus-ring)] peer-checked:border-accent peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:h-[15px] after:w-[15px] after:rounded-full after:bg-muted after:transition-[transform,background-color] after:duration-200 after:content-[''] peer-checked:after:translate-x-[17px] peer-checked:after:bg-accent-contrast"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {label && (
                      <span className="text-[.8125rem] font-medium text-body">
                        {label}
                      </span>
                    )}
                    {description && (
                      <p className="mt-0.5 text-[.6875rem] text-faint">
                        {description}
                      </p>
                    )}
                  </div>
                </label>
                {hasError && (
                  <p
                    id={`${String(name)}-error`}
                    role="alert"
                    className="ml-[50px] mt-1 text-[.6875rem] font-semibold text-danger"
                  >
                    {errorMsg}
                  </p>
                )}
              </div>
            );
          }

          // Regular fields - vertical layout
          if (editor === "select") {
            forwarded.options = meta.options ?? [];
          }

          return (
            <div className="flex flex-col gap-[5px]">
              {/* `.og-fl .l` — a .625rem/700 micro-label in the faint tone. A .75rem
                  semibold body-coloured label competed with the value it introduces. */}
              {label && (
                <label
                  htmlFor={String(name)}
                  className="block text-[.625rem] font-bold uppercase tracking-[.05em] text-faint"
                >
                  {label}
                  {meta.required && (
                    // The asterisk was visual only; give it a text equivalent.
                    <span className="text-danger ml-1">
                      *<span className="sr-only"> required</span>
                    </span>
                  )}
                </label>
              )}
              <div>
                <Field
                  {...forwarded}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
                {/* The error replaces the hint rather than stacking under it — one
                    line of guidance per field, per spec. */}
                {description && !hasError && (
                  <p
                    id={`${String(name)}-desc`}
                    className="mt-1 text-[.6875rem] text-faint"
                  >
                    {description}
                  </p>
                )}
                {hasError && (
                  <p
                    id={`${String(name)}-error`}
                    role="alert"
                    className="mt-1 text-[.6875rem] font-semibold text-danger"
                  >
                    {errorMsg}
                  </p>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
