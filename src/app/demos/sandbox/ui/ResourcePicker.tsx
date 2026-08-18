import {
  CheckSquare,
  Database,
  FileText,
  Folder,
  Image as ImageIcon,
  MessageSquare,
  Users as UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { ResourceType } from "../types";

const RESOURCES: {
  key: ResourceType;
  label: string;
  count: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { key: "users", label: "Users", count: "10 items", icon: UsersIcon, color: "bg-accent text-accent-contrast" },
  { key: "posts", label: "Posts", count: "100 items", icon: FileText, color: "bg-indigo-600 text-white" },
  { key: "comments", label: "Comments", count: "500 items", icon: MessageSquare, color: "bg-purple-600 text-white" },
  { key: "albums", label: "Albums", count: "100 items", icon: Folder, color: "bg-warning text-white" },
  { key: "photos", label: "Photos", count: "5,000 items (Virtual)", icon: ImageIcon, color: "bg-rose-600 text-white" },
  { key: "todos", label: "Todos", count: "200 items", icon: CheckSquare, color: "bg-emerald-600 text-white" },
];

const ACTIVE_FRAME =
  "border-accent ring-2 ring-[var(--rui-focus-ring)] bg-accent-subtle shadow-xs";
const IDLE_FRAME =
  "border-border-default hover:border-accent hover:bg-surface-inset bg-surface-card";

export function ResourcePicker({
  active,
  loadedCount,
  onSelect,
}: {
  active: ResourceType;
  loadedCount: number;
  onSelect: (resource: ResourceType) => void;
}) {
  return (
    <div className="bg-surface-card border border-border-default rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-body font-bold text-sm">
          <Database className="h-4 w-4 text-accent" />
          <span>Select Endpoint Dataset:</span>
        </div>
        <span className="text-xs text-muted font-medium">
          Active:{" "}
          <code className="bg-surface-inset px-1.5 py-0.5 rounded text-accent">
            /{active}
          </code>{" "}
          ({loadedCount} items loaded)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {RESOURCES.map(({ key, label, count, icon: Icon, color }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${isActive ? ACTIVE_FRAME : IDLE_FRAME}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`p-1.5 rounded-md ${isActive ? color : "bg-surface-inset text-muted"}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {isActive && (
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                )}
              </div>
              <div>
                <div
                  className={`font-bold text-sm ${isActive ? "text-accent" : "text-body"}`}
                >
                  {label}
                </div>
                <div className="text-[11px] text-muted font-medium">{count}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
