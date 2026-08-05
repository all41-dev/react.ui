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
import { SwitchInput } from "../inputs/SwitchInput";
import { DateInput } from "../inputs/DateInput";
import { TextArea } from "../inputs/TextArea";

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

  const Comp =
    editor === "text"
      ? TextInput
      : editor === "number"
      ? NumberInput
      : editor === "select"
      ? SelectInput
      : editor === "switch"
      ? SwitchInput
      : editor === "date"
      ? DateInput
      : editor === "textarea"
      ? TextArea
      : null;

  if (!Comp) return null;

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
          const baseClass =
            "w-full rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm text-body placeholder:text-faint transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-[var(--rui-focus-ring)] focus:outline-none hover:border-accent";
          const invalidClass = hasError
            ? "border-danger focus:border-danger focus:ring-[var(--rui-focus-ring)]"
            : "";

          const forwarded: any = {
            id: String(name),
            className: [
              baseClass,
              invalidClass,
              (meta.editorProps as any)?.className,
            ]
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
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      id={String(name)}
                      checked={Boolean(field.value)}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="sr-only peer"
                      {...(meta.editorProps as any)}
                    />
                    <div className="w-11 h-6 bg-surface-inset peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--rui-focus-ring)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-accent-contrast after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-card after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {label && (
                      <span className="text-sm font-medium text-body group-hover:text-body">
                        {label}
                      </span>
                    )}
                    {description && (
                      <p className="text-xs text-muted mt-0.5">
                        {description}
                      </p>
                    )}
                  </div>
                </label>
                {hasError && (
                  <p className="text-xs text-danger mt-1.5 ml-14">
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
            <div className="space-y-1.5">
              {label && (
                <label
                  htmlFor={String(name)}
                  className="block text-xs font-semibold text-body uppercase tracking-wide"
                >
                  {label}
                  {meta.required && (
                    <span className="text-danger ml-1">*</span>
                  )}
                </label>
              )}
              <div>
                <Comp
                  {...forwarded}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
                {description && (
                  <p className="text-xs text-muted mt-1.5">{description}</p>
                )}
                {hasError && (
                  <p className="text-xs text-danger mt-1.5 font-medium">
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
