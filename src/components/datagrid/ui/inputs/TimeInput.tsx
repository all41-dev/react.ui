import type { InputHTMLAttributes } from "react";

export type TimeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function TimeInput({ value, onChange, className, ...rest }: TimeInputProps) {
  return (
    <input
      type="time"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      {...rest}
    />
  );
}
