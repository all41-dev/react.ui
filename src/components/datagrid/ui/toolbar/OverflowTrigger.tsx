import { ChevronDown } from "lucide-react";

import { BTN, BTN_OFF, BTN_ON } from "../toolbarStyles";

/** The overflow menu's button, welded to the search field when there is one. */
export function OverflowTrigger({
  open,
  engaged,
  activeFilterCount,
  panelId,
  attached,
  onToggle,
}: {
  open: boolean;
  /** Some filter or grouping is applied — the trigger stays lit while it is. */
  engaged: boolean;
  activeFilterCount: number;
  panelId: string;
  attached?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      /* `true` means exactly "menu", and this is deliberately not a menu (see
         ToolbarOverflowMenu) — the panel is a `role="dialog"`, so promise that. */
      aria-haspopup="dialog"
      aria-controls={open ? panelId : undefined}
      aria-label="Filters, columns and grouping"
      title="Filters, columns and grouping"
      className={[
        BTN,
        engaged || open ? BTN_ON : BTN_OFF,
        attached ? "h-auto self-stretch rounded-l-none" : "",
      ].join(" ")}
    >
      {activeFilterCount > 0 && (
        <span className="rounded-full bg-accent px-1.5 font-mono text-[.6875rem] font-semibold leading-4 text-accent-contrast">
          {activeFilterCount}
        </span>
      )}
      {/* A caret, not an ellipsis: this opens a panel attached to the field, and the
          rotation says which way it is. An ellipsis promises a loose list of commands. */}
      <ChevronDown
        className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        aria-hidden
      />
    </button>
  );
}
