import type { InputHTMLAttributes } from "react";

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function TextInput({
  value,
  onChange,
  className,
  ...rest
}: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      {...rest}
    />
  );
}
