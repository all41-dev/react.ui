import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Providers } from "./providers/providers";
import { useTheme } from "./providers/theme-context";
import { DataGridDemo } from "./demos/DataGridDemo";
import { ArticlesGridDemo } from "./demos/articles/ArticlesGridDemo";
import { ToasterDemo } from "./demos/ToasterDemo";
import { TooltipDemo } from "./demos/TooltipDemo";
import { LoadingScreenDemo } from "./demos/LoadingScreenDemo";

type DemoTab = "datagrid" | "articles" | "toaster" | "tooltip" | "loading";

const TABS: { id: DemoTab; label: string }[] = [
  { id: "datagrid", label: "DataGrid" },
  { id: "articles", label: "Articles" },
  { id: "toaster", label: "Toaster" },
  { id: "tooltip", label: "Tooltip" },
  { id: "loading", label: "Loading screen" },
];

function App() {
  const [activeTab, setActiveTab] = useState<DemoTab>("datagrid");

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
          <nav className="mx-auto flex max-w-7xl gap-1 border-b border-border-default">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </TabButton>
            ))}
          </nav>
        </div>

        <main className="mx-auto max-w-7xl px-9 py-6">
          {activeTab === "datagrid" && <DataGridDemo />}
          {activeTab === "articles" && <ArticlesGridDemo />}
          {activeTab === "toaster" && <ToasterDemo />}
          {activeTab === "tooltip" && <TooltipDemo />}
          {activeTab === "loading" && <LoadingScreenDemo />}
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-2 px-4 py-3 text-[.8125rem] transition-colors ${
        active
          ? "border-accent font-semibold text-accent"
          : "border-transparent text-muted hover:border-border-translucent hover:text-body"
      }`}
    >
      {children}
    </button>
  );
}

export default App;
