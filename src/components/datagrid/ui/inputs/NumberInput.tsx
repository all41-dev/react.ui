import type { InputHTMLAttributes } from "react";

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> & {
  value: number | string | null | undefined;
  /**
   * `null` for an emptied field, never `undefined`. react-hook-form treats `undefined` as
   * "no value set" and falls back to the form default on the next read, which snaps a
   * cleared optional field back to the value it started with.
   */
  onChange: (value: number | null) => void;
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
        if (v === "") return onChange(null);
        const n = Number(v);
        onChange(Number.isNaN(n) ? null : n);
      }}
      className={className}
      {...rest}
    />
  );
}
