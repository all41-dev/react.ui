import { AlertTriangle } from "lucide-react";
import type { Simulation } from "../useSandboxSettings";

const LABELS: [keyof Simulation, string][] = [
  ["fetchError", "Fetch Error (500)"],
  ["saveError", "Save Error (500)"],
  ["deleteError", "Delete Error (403)"],
];

/** Injected failures are easy to forget about; this keeps them in sight. */
export function SimulationBanner({
  simulation,
  onClear,
}: {
  simulation: Simulation;
  onClear: () => void;
}) {
  const active = LABELS.filter(([key]) => simulation[key]).map(([, label]) => label);
  if (active.length === 0) return null;

  return (
    <div className="bg-warning/15 border-l-4 border-warning p-3 rounded-r-lg text-xs text-body flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <span>
          <strong>Active Error Simulations:</strong> {active.join(", ")}
        </span>
      </div>
      <button
        onClick={onClear}
        className="text-body underline font-medium hover:text-warning cursor-pointer"
      >
        Clear All Simulations
      </button>
    </div>
  );
}
