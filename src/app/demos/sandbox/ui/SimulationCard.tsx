import { AlertTriangle } from "lucide-react";
import type { SandboxSettings } from "../useSandboxSettings";
import { CheckRow, ConfigCard, Segmented } from "./controls";

/* Under, around and well past the grid's 250 ms loading delay. */
const LATENCIES = [100, 400, 3000] as const;

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
      <Segmented
        label="Latency — under, around and past the grid's 250 ms loading delay"
        options={LATENCIES}
        value={
          LATENCIES.find((ms) => ms === simulation.delay) ?? LATENCIES[1]
        }
        onChange={(ms) => setSim("delay", ms)}
        render={(ms) => (ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`)}
      />
    </ConfigCard>
  );
}
