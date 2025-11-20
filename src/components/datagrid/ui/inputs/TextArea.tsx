import type { TextareaHTMLAttributes } from "react";

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> & {
  value: string;
  onChange: (value: string) => void;
};

export function TextArea({
  value,
  onChange,
  className,
  rows = 4,
  ...rest
}: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={className}
      {...rest}
    />
  );
}
