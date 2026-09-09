/*
 * One labelled value: a small uppercase label beside the value it names. For a
 * header's summary line or a details card, where a row of these reads as a table
 * without being one. The `danger` tone mixes toward the body text for contrast.
 */

export type KeyValueTone = "accent" | "faint" | "danger";

const TONE: Record<KeyValueTone, string> = {
  accent: "text-accent",
  faint: "text-faint",
  danger:
    "font-semibold text-[color-mix(in_srgb,var(--rui-danger)_80%,var(--rui-text-body))]",
};

export function KeyValue({
  label,
  value,
  mono = false,
  tone,
  title,
  className = "",
}: {
  label: string;
  value: string;
  /** The value in the mono font — ids, codes, numbers. */
  mono?: boolean;
  tone?: KeyValueTone;
  title?: string;
  className?: string;
}) {
  return (
    <span
      className={`flex min-w-0 items-baseline gap-1.5 ${className}`}
      title={title}
    >
      <span className="flex-none text-[.625rem] font-bold uppercase tracking-[.05em] text-faint">
        {label}
      </span>
      <span
        className={`truncate text-xs ${mono ? "font-mono" : ""} ${tone ? TONE[tone] : "text-body"}`}
      >
        {value}
      </span>
    </span>
  );
}
