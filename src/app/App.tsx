import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Providers } from "./providers/providers";
import { useTheme } from "./providers/theme-context";
import { Tabs, type TabItem } from "../components/Tabs";
import { tabId, tabPanelId } from "../components/tabIds";
import { DataGridDemo } from "./demos/DataGridDemo";
import { ToasterDemo } from "./demos/ToasterDemo";
import { TooltipDemo } from "./demos/TooltipDemo";
import { LoadingScreenDemo } from "./demos/LoadingScreenDemo";
import { TabsDemo } from "./demos/TabsDemo";
import { StatesDemo } from "./demos/StatesDemo";
import { BadgesDemo } from "./demos/BadgesDemo";

type DemoTab =
  | "datagrid"
  | "tabs"
  | "states"
  | "badges"
  | "toaster"
  | "tooltip"
  | "loading";

/* The sandbox's own navigation is the library's Tabs — the first thing on the page is a component under test. */
const TABS: TabItem<DemoTab>[] = [
  { key: "datagrid", label: "DataGrid" },
  { key: "tabs", label: "Tabs" },
  { key: "states", label: "Empty & error states" },
  { key: "badges", label: "Badge & key–value" },
  { key: "toaster", label: "Toaster" },
  { key: "tooltip", label: "Tooltip" },
  { key: "loading", label: "Loading screen" },
];

const DEMOS: Record<DemoTab, () => React.JSX.Element> = {
  datagrid: DataGridDemo,
  tabs: TabsDemo,
  states: StatesDemo,
  badges: BadgesDemo,
  toaster: ToasterDemo,
  tooltip: TooltipDemo,
  loading: LoadingScreenDemo,
};

function App() {
  const [activeTab, setActiveTab] = useState<DemoTab>("datagrid");
  const Demo = DEMOS[activeTab];

  return (
    <Providers>
      <div className="min-h-screen bg-surface-page text-body font-sans">
        <header className="px-9 pt-8 pb-0">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
            <div>
              <p className="text-[.6875rem] font-medium uppercase tracking-[.06em] text-faint">
                Component workbench
              </p>
              <h1 className="mt-1 text-2xl font-medium tracking-[-.01em]">
                React UI Sandbox
              </h1>
              <p className="mt-1 text-[.8125rem] text-muted">
                Component showcase and testing environment
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="px-9">
          <Tabs
            tabs={TABS}
            value={activeTab}
            onChange={setActiveTab}
            label="Demos"
            idPrefix="demo"
            className="mx-auto max-w-7xl"
          />
        </div>

        <main
          id={tabPanelId("demo", activeTab)}
          role="tabpanel"
          aria-labelledby={tabId("demo", activeTab)}
          className="mx-auto max-w-7xl px-9 py-6"
        >
          <Demo />
        </main>
      </div>
    </Providers>
  );
}

/** Label names the theme it switches TO, not the one currently active. */
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const Icon = next === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      className="flex h-8 shrink-0 items-center gap-2 rounded-control border border-border-default
                 bg-transparent px-3 text-[.8125rem] text-muted transition-colors
                 hover:border-accent hover:text-body
                 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--rui-focus-ring)]"
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden />
      {next === "dark" ? "Dark theme" : "Light theme"}
    </button>
  );
}

export default App;
