import type { SelectHTMLAttributes } from "react";
import type { Option } from "../../types/column";

export type SelectInputProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholderOption?: string;
};

export function SelectInput({
  value,
  onChange,
  options,
  placeholderOption = "Select…",
  className,
  ...rest
}: SelectInputProps) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      {...rest}
    >
      {/* Selectable, not disabled: an optional field has to be able to go back to no
          value. Requiredness is enforced by the zod schema, not by the control. */}
      <option value="">{placeholderOption}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
