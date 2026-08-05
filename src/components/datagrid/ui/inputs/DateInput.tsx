import type { InputHTMLAttributes } from "react";

export type DateInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> & {
  /** Accepts yyyy-MM-dd, ISO datetimes, or Date objects — coerced for the input. */
  value: unknown;
  onChange: (value: string) => void;
};

/**
 * <input type="date"> only understands yyyy-MM-dd. Feeding it a Date or an ISO
 * datetime ("2024-01-15T10:30:00Z") rendered an empty control, and saving wrote
 * a bare date string over the datetime. (#9)
 *
 * Coercion uses LOCAL calendar parts — an ISO instant run through toISOString()
 * can land on the previous/next day in the user's timezone.
 */
function toDateInputValue(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateInput({ value, onChange, className, ...rest }: DateInputProps) {
  return (
    <input
      type="date"
      value={toDateInputValue(value)}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      {...rest}
    />
  );
}
