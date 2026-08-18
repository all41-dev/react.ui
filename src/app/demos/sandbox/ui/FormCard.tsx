import { Layout } from "lucide-react";
import type { SandboxSettings } from "../useSandboxSettings";
import { ConfigCard, Segmented } from "./controls";

const CONTAINERS = ["right", "bottom", "modal", "inline"] as const;
const GROUPINGS = ["off", "stacked", "split"] as const;
const COLUMN_COUNTS = [1, 2, 3] as const;

export function FormCard({ settings }: { settings: SandboxSettings }) {
  const usersOnly = settings.resource !== "users";
  return (
    <ConfigCard
      title="Form Container & Grid"
      icon={<Layout className="h-4 w-4 text-accent" />}
    >
      <Segmented
        label="Edit Container:"
        options={CONTAINERS}
        value={settings.container}
        onChange={settings.setContainer}
      />
      <Segmented
        label={
          <>
            Field Groups:{" "}
            {usersOnly && <span className="text-faint font-normal">(users only)</span>}
          </>
        }
        options={GROUPINGS}
        value={settings.formGrouping}
        onChange={settings.setFormGrouping}
        disabled={usersOnly}
      />
      <Segmented
        label="Form Columns:"
        options={COLUMN_COUNTS}
        value={settings.formCols}
        onChange={settings.setFormCols}
        render={(n) => `${n} Col`}
      />
    </ConfigCard>
  );
}
