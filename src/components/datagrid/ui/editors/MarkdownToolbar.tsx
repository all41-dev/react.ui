import { TOOLS, type ToolAction } from "./markdownTools";

type Tab = "write" | "preview";

type Props = {
  /** Omitted in split mode, where both panes are on screen and there is nothing to switch. */
  tab?: Tab;
  onTabChange?: (tab: Tab) => void;
  onTool: (action: ToolAction) => void;
};

export function MarkdownToolbar({ tab, onTabChange, onTool }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default bg-surface-card px-2 py-1">
      <div className="flex items-center gap-0.5">
        {TOOLS.map(({ action, label, Icon }) => (
          <button
            key={action}
            type="button"
            title={label}
            aria-label={label}
            /*
             * `mousedown` fires before the textarea loses its selection, so the pointer
             * path must preventDefault and act there. Enter/Space dispatch `click` with
             * no preceding `mousedown`, and only a keyboard-synthesised click reports
             * `detail === 0` — that test is what keeps a mouse click from applying the
             * tool twice.
             */
            onMouseDown={(e) => {
              e.preventDefault();
              onTool(action);
            }}
            onClick={(e) => {
              if (e.detail === 0) onTool(action);
            }}
            disabled={tab === "preview"}
            className="grid h-6 min-w-[26px] cursor-pointer place-items-center rounded-[5px] px-1.5 text-faint transition-colors hover:bg-surface-raised hover:text-body disabled:opacity-40"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      {tab && onTabChange && (
        <div className="flex items-center gap-0.5 rounded-md bg-surface-inset p-0.5 text-[.75rem]">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange(t)}
              aria-pressed={tab === t}
              className={`cursor-pointer rounded px-2 py-0.5 capitalize transition-colors ${
                tab === t
                  ? "bg-surface-card font-semibold text-accent shadow-[0_1px_2px_rgba(0,0,0,.18)]"
                  : "text-faint hover:text-body"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
