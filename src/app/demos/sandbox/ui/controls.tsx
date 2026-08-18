const BUTTON_BASE =
  "py-1 px-2 rounded text-center capitalize font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const SELECTED = "bg-accent text-accent-contrast shadow-xs";
const UNSELECTED = "bg-surface-inset text-body hover:bg-surface-inset";

type SegmentedProps<T extends string | number> = {
  label: React.ReactNode;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Defaults to the option itself. */
  render?: (option: T) => React.ReactNode;
};

/** One row of the config cards: a caption over a strip of mutually exclusive buttons. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled,
  render,
}: SegmentedProps<T>) {
  return (
    <div>
      <span className="block text-muted font-medium mb-1">{label}</span>
      <div className="grid grid-cols-3 gap-1">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            disabled={disabled}
            className={`${BUTTON_BASE} ${option === value ? SELECTED : UNSELECTED}`}
          >
            {render ? render(option) : option}
          </button>
        ))}
      </div>
    </div>
  );
}

type CheckRowProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tone?: "accent" | "warning";
};

/** A labelled checkbox that fills its row — the whole row is the hit target. */
export function CheckRow({ label, checked, onChange, tone = "accent" }: CheckRowProps) {
  const warning = tone === "warning";
  return (
    <label
      className={`flex items-center justify-between cursor-pointer ${warning ? "p-1.5 rounded hover:bg-warning/15" : "pt-0.5"}`}
    >
      <span className="font-medium text-body">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 rounded cursor-pointer focus:ring-[var(--rui-focus-ring)] ${warning ? "border-warning/40 text-warning" : "border-border-default text-accent"}`}
      />
    </label>
  );
}

/** Shell shared by the four configuration cards. */
export function ConfigCard({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "warning";
  children: React.ReactNode;
}) {
  const frame =
    tone === "warning"
      ? "bg-warning/10 border-warning/40"
      : "bg-surface-card border-border-default";
  return (
    <div className={`border rounded-xl p-4 space-y-3 ${frame}`}>
      <div className="flex items-center gap-2 text-body font-semibold text-sm">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-2 text-xs">{children}</div>
    </div>
  );
}
