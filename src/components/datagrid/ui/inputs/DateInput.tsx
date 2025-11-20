import type { InputHTMLAttributes } from "react";

export type DateInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function DateInput({
  value,
  onChange,
  className,
  ...rest
}: DateInputProps) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      {...rest}
    />
  );
}
