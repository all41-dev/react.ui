import { Inbox, Layers, RefreshCw } from "lucide-react";
import type { SandboxSettings } from "../useSandboxSettings";
import { CheckRow, ConfigCard } from "./controls";

type Props = {
  settings: SandboxSettings;
  onReload: () => void;
  onClearData: () => void;
  onAccordionChange: (accordion: boolean) => void;
};

export function ActionsCard({
  settings,
  onReload,
  onClearData,
  onAccordionChange,
}: Props) {
  return (
    <ConfigCard title="Quick Actions" icon={<Layers className="h-4 w-4 text-accent" />}>
      <button
        onClick={onReload}
        className="w-full py-1 px-3 rounded bg-accent hover:bg-accent-hover text-accent-contrast font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Reload Data
      </button>
      <button
        onClick={onClearData}
        className="w-full py-1 px-3 rounded border border-border-default hover:bg-surface-inset text-body font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
      >
        <Inbox className="h-3.5 w-3.5 text-faint" /> Clear Data (Empty State)
      </button>
      <CheckRow
        label="Expandable JSON:"
        checked={settings.expandable}
        onChange={settings.setExpandable}
      />
      {settings.expandable && (
        <CheckRow
          label="Single Accordion:"
          checked={settings.accordion}
          onChange={onAccordionChange}
        />
      )}
    </ConfigCard>
  );
}
