import type { InputHTMLAttributes } from "react";

export type SwitchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "checked" | "value"
> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Simple checkbox switch*/
export function SwitchInput({
  checked,
  onChange,
  className,
  ...rest
}: SwitchInputProps) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={["h-4 w-4 rounded border", className]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
    </label>
  );
}
