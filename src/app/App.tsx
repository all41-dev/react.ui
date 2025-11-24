import { useState } from "react";
import { Providers } from "./providers/providers";
import { DataGridDemo } from "./demos/DataGridDemo";
import { ToasterDemo } from "./demos/ToasterDemo";
import { TooltipDemo } from "./demos/TooltipDemo";

type DemoTab = "datagrid" | "toaster" | "tooltip";

function App() {
  const [activeTab, setActiveTab] = useState<DemoTab>("datagrid");

  return (
    <Providers>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-3xl font-bold text-gray-900">React UI Sandbox</h1>
            <p className="text-gray-600 mt-1">Component showcase and testing environment</p>
          </div>
        </header>

        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex gap-1">
              <TabButton
                active={activeTab === "datagrid"}
                onClick={() => setActiveTab("datagrid")}
              >
                DataGrid
              </TabButton>
              <TabButton
                active={activeTab === "toaster"}
                onClick={() => setActiveTab("toaster")}
              >
                Toaster
              </TabButton>
              <TabButton
                active={activeTab === "tooltip"}
                onClick={() => setActiveTab("tooltip")}
              >
                Tooltip
              </TabButton>
            </nav>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-7xl mx-auto py-6">
          {activeTab === "datagrid" && <DataGridDemo />}
          {activeTab === "toaster" && <ToasterDemo />}
          {activeTab === "tooltip" && <TooltipDemo />}
        </main>
      </div>
    </Providers>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 font-medium transition-colors border-b-2 ${
        active
          ? "text-blue-700 border-blue-700"
          : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

export default App;
