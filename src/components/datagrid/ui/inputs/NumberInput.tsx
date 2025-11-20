import type { InputHTMLAttributes } from "react";

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> & {
  value: number | string | undefined;
  onChange: (value: number | undefined) => void;
};

export function NumberInput({
  value,
  onChange,
  className,
  ...rest
}: NumberInputProps) {
  const str = value == null || value === "" ? "" : String(value);
  return (
    <input
      type="number"
      value={str}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") return onChange(undefined);
        const n = Number(v);
        onChange(Number.isNaN(n) ? undefined : n);
      }}
      className={className}
      {...rest}
    />
  );
}
