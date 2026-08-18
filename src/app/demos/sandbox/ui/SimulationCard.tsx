import { AlertTriangle } from "lucide-react";
import type { SandboxSettings } from "../useSandboxSettings";
import { CheckRow, ConfigCard } from "./controls";

export function SimulationCard({ settings }: { settings: SandboxSettings }) {
  const { simulation, setSim } = settings;
  return (
    <ConfigCard
      tone="warning"
      title="Error Simulation Center"
      icon={<AlertTriangle className="h-4 w-4 text-warning" />}
    >
      <CheckRow
        tone="warning"
        label="Fetch Error (500)"
        checked={simulation.fetchError}
        onChange={(v) => setSim("fetchError", v)}
      />
      <CheckRow
        tone="warning"
        label="Save Error (500)"
        checked={simulation.saveError}
        onChange={(v) => setSim("saveError", v)}
      />
      <CheckRow
        tone="warning"
        label="Delete Error (403)"
        checked={simulation.deleteError}
        onChange={(v) => setSim("deleteError", v)}
      />
    </ConfigCard>
  );
}
