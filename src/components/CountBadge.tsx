/*
 * A count in a pill. `danger` mixes the danger colour toward the body text so the
 * digits keep their contrast at the small sizes a badge is set in, where the base
 * status colour alone falls short.
 */

export type CountBadgeTone = "neutral" | "accent" | "danger";

const TONE: Record<CountBadgeTone, string> = {
  neutral: "bg-surface-raised text-muted",
  accent: "bg-accent text-accent-contrast",
  danger:
    "bg-[color-mix(in_srgb,var(--rui-danger)_18%,transparent)] text-[color-mix(in_srgb,var(--rui-danger)_80%,var(--rui-text-body))]",
};

const SIZE = {
  sm: "h-[15px] px-1 text-[.5625rem]",
  md: "h-[17px] px-1.5 text-[.625rem]",
};

export function CountBadge({
  count,
  tone = "neutral",
  size = "md",
  title,
  className = "",
}: {
  count: number;
  tone?: CountBadgeTone;
  size?: keyof typeof SIZE;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex flex-none items-center rounded-full font-mono font-bold leading-none ${TONE[tone]} ${SIZE[size]} ${className}`}
    >
      {count}
    </span>
  );
}
