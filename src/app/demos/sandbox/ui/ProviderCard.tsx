import { Database } from "lucide-react";
import type { SandboxSettings } from "../useSandboxSettings";
import { ConfigCard } from "./controls";

const SELECTED = "bg-emerald-600 text-white shadow-xs";
const UNSELECTED = "bg-surface-inset text-body hover:bg-surface-inset";

export function ProviderCard({ settings }: { settings: SandboxSettings }) {
  const { simulation, setSim } = settings;
  return (
    <ConfigCard
      title="Data Provider & Delay"
      icon={<Database className="h-4 w-4 text-success" />}
    >
      <div>
        <span className="block text-muted font-medium mb-1">Provider:</span>
        <div className="grid grid-cols-2 gap-1">
          {/* The local fixture only covers users; the HTTP mock covers everything. */}
          <ProviderButton
            label="Local Mock"
            selected={settings.dataSource === "mock-data"}
            disabled={settings.resource !== "users"}
            onClick={() => settings.setDataSource("mock-data")}
          />
          <ProviderButton
            label="HTTP API"
            selected={settings.dataSource === "mock-api"}
            onClick={() => settings.setDataSource("mock-api")}
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between text-muted font-medium mb-1">
          <span>Latency:</span>
          <span className="text-body font-bold">{simulation.delay}ms</span>
        </div>
        <input
          type="range"
          min="0"
          max="2000"
          step="250"
          value={simulation.delay}
          onChange={(e) => setSim("delay", Number(e.target.value))}
          className="w-full h-1.5 bg-surface-inset rounded-lg appearance-none cursor-pointer accent-emerald-600"
          aria-label="Simulated latency in milliseconds"
        />
      </div>
    </ConfigCard>
  );
}

function ProviderButton({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-1 px-2 rounded font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${selected ? SELECTED : UNSELECTED}`}
    >
      {label}
    </button>
  );
}
