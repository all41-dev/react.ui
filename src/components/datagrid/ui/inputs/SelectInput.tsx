import type { SelectHTMLAttributes } from "react";

export type Option = { value: string; label: string };

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
      <option value="" disabled>
        {placeholderOption}
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
