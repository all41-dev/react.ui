const ROLE_BADGE = "bg-accent-subtle text-accent border-accent";
const NEUTRAL_BADGE = "bg-surface-inset text-body border-border-default";

export function RoleBadge({ value }: { value: unknown }) {
  const accent = value === "Admin" || value === "Editor";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${accent ? ROLE_BADGE : NEUTRAL_BADGE}`}
    >
      {String(value ?? "")}
    </span>
  );
}

const STATUS_TONE: Record<string, { chip: string; dot: string }> = {
  active: { chip: "bg-success/15 text-success", dot: "bg-green-500" },
  inactive: { chip: "bg-danger/15 text-danger", dot: "bg-danger" },
};
const PENDING_TONE = { chip: "bg-warning/15 text-body", dot: "bg-warning" };

export function StatusBadge({ value }: { value: unknown }) {
  const tone = STATUS_TONE[String(value)] ?? PENDING_TONE;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${tone.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {String(value ?? "")}
    </span>
  );
}

export function DoneBadge({ value }: { value: unknown }) {
  const done = Boolean(value);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${done ? "bg-success/15 text-success" : "bg-warning/15 text-body"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-600" : "bg-warning"}`}
      />
      {done ? "Completed" : "Pending"}
    </span>
  );
}
