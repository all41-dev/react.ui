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
            "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none hover:border-gray-400";
          const invalidClass = hasError
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    {label && (
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                        {label}
                      </span>
                    )}
                    {description && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {description}
                      </p>
                    )}
                  </div>
                </label>
                {hasError && (
                  <p className="text-xs text-red-600 mt-1.5 ml-14">
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
                  className="block text-xs font-semibold text-gray-700 uppercase tracking-wide"
                >
                  {label}
                  {meta.required && (
                    <span className="text-red-500 ml-1">*</span>
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
                  <p className="text-xs text-gray-500 mt-1.5">{description}</p>
                )}
                {hasError && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">
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
