import type { ButtonHTMLAttributes, ReactNode } from "react";

/*
 * Square icon-only button: transparent until hover, named for assistive tech by
 * `label`, which is also the tooltip unless `title` is given. `sm` is the grid's
 * row-action size, so one sits level with Edit and Delete in the pill; `md` is the
 * size of a panel header's controls.
 */

export type IconButtonProps = {
  label: string;
  size?: "sm" | "md";
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children">;

const SIZE: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "size-6.5",
  md: "size-7",
};

export function IconButton({
  label,
  size = "md",
  className = "",
  title,
  type = "button",
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={`grid ${SIZE[size]} flex-none cursor-pointer place-items-center rounded-md border border-transparent bg-transparent text-faint transition-colors hover:border-border-default hover:bg-surface-raised hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
