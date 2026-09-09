import { useState } from "react";
import { Clock, FileText, ListChecks, ShieldAlert } from "lucide-react";
import { TabPanel, Tabs, type TabItem } from "../../components/Tabs";

type Key = "overview" | "history" | "notes" | "audit";

const TABS: TabItem<Key>[] = [
  { key: "overview", label: "Overview", icon: <ListChecks size={13} aria-hidden />, count: 12 },
  { key: "history", label: "History", icon: <Clock size={13} aria-hidden />, count: 340 },
  { key: "notes", label: "Notes", icon: <FileText size={13} aria-hidden /> },
  {
    key: "audit",
    label: "Audit",
    icon: <ShieldAlert size={13} aria-hidden />,
    disabledReason: "No audit trail is served yet",
  },
];

const PANEL: Record<Key, string> = {
  overview: "Twelve items, the newest first.",
  history: "Every change, with who made it and when.",
  notes: "Free text kept with the record.",
  audit: "",
};

export function TabsDemo() {
  const [dense, setDense] = useState<Key>("overview");
  const [regular, setRegular] = useState<Key>("history");

  return (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Tabs</h2>
        <p className="text-muted">
          One tab stop: arrows move and select, Home and End jump, Tab leaves the row.
          A tab with a <code>disabledReason</code> is shown but cannot be opened — the
          reason is its accessible description and its tooltip, and the arrow keys step
          over it. <code>TabPanel</code> takes the same <code>idPrefix</code> so the tab
          and its panel name each other.
        </p>
      </div>

      <section className="rounded-surface border border-border-default bg-surface-card">
        <h3 className="px-4 pt-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
          Dense row, in a toolbar-height host
        </h3>
        <Tabs
          tabs={TABS}
          value={dense}
          onChange={setDense}
          size="sm"
          idPrefix="dense"
          label="Record sections"
          className="px-4"
        />
        <TabPanel idPrefix="dense" tab={dense} focusable className="p-4 text-[.8125rem]">
          {PANEL[dense]}
        </TabPanel>
      </section>

      <section className="rounded-surface border border-border-default bg-surface-card">
        <h3 className="px-4 pt-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
          Regular row
        </h3>
        <Tabs
          tabs={TABS}
          value={regular}
          onChange={setRegular}
          idPrefix="regular"
          label="Record sections"
          className="px-4"
        />
        <TabPanel idPrefix="regular" tab={regular} className="p-4 text-[.8125rem]">
          {PANEL[regular]}
        </TabPanel>
      </section>
    </div>
  );
}
