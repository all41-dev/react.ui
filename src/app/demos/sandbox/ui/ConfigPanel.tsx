import type { SandboxSettings } from "../useSandboxSettings";
import { ActionsCard } from "./ActionsCard";
import { FormCard } from "./FormCard";
import { ProviderCard } from "./ProviderCard";
import { SimulationCard } from "./SimulationCard";

type Props = {
  settings: SandboxSettings;
  onReload: () => void;
  onClearData: () => void;
  onAccordionChange: (accordion: boolean) => void;
};

export function ConfigPanel({ settings, ...actions }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SimulationCard settings={settings} />
      <FormCard settings={settings} />
      <ProviderCard settings={settings} />
      <ActionsCard settings={settings} {...actions} />
    </div>
  );
}
