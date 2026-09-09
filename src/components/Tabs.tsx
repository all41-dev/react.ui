import { useId, type KeyboardEvent, type ReactNode } from "react";

import { tabId, tabPanelId, tabReasonId as reasonId } from "./tabIds";

/*
 * A tab row and the panel it labels. One tab stop: arrows move within the row and
 * select as they go, Home and End jump to the ends, Tab leaves. A tab with a
 * `disabledReason` is shown but cannot be opened: it points at no panel, carries the
 * reason as its accessible description, and the arrow walk steps over it.
 */

export type TabItem<K extends string = string> = {
  key: K;
  label: string;
  /** Rendered before the label. Sized by the caller. */
  icon?: ReactNode;
  /** Shown after the label in the mono font; omitted when undefined. */
  count?: number;
  /** Why the tab cannot be opened. Its presence disables the tab. */
  disabledReason?: string;
};

export type TabsProps<K extends string> = {
  tabs: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Accessible name of the row. */
  label?: string;
  /**
   * Prefix of the element ids: the tab `<prefix>-tab-<key>` controls the panel
   * `<prefix>-panel-<key>`. Generated when omitted; pass one to hand the same prefix
   * to `TabPanel`.
   */
  idPrefix?: string;
  /** `sm` is the dense row for a toolbar-height host. */
  size?: "sm" | "md";
  className?: string;
};

const STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };

const ROW: Record<NonNullable<TabsProps<string>["size"]>, string> = {
  sm: "h-9 gap-4 text-xs",
  md: "h-11 gap-5 text-[.8125rem]",
};

export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  label = "Tabs",
  idPrefix,
  size = "md",
  className = "",
}: TabsProps<K>) {
  const autoPrefix = useId().replace(/:/g, "_");
  const prefix = idPrefix ?? autoPrefix;
  const isDisabled = (t: TabItem<K>) => t.disabledReason !== undefined;
  const reasons = tabs.filter(isDisabled);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, at: number) => {
    const step = STEP[e.key];
    const home = e.key === "Home";
    const end = e.key === "End";
    if (!step && !home && !end) return;
    e.preventDefault();

    // Selection follows focus, so a disabled tab is stepped over rather than
    // landed on; a row of nothing but disabled tabs stays put.
    const from = home ? -1 : end ? tabs.length : at;
    const direction = home ? 1 : end ? -1 : step;
    let next = from;
    for (let moved = 0; moved < tabs.length; moved++) {
      next = (next + direction + tabs.length) % tabs.length;
      if (!isDisabled(tabs[next])) break;
    }
    if (next === at || isDisabled(tabs[next])) return;

    onChange(tabs[next].key);
    const row = e.currentTarget.parentElement;
    (row?.children[next] as HTMLElement | undefined)?.focus();
  };

  return (
    <>
      {/*
       * Why each disabled tab cannot be opened. Outside the tablist because the
       * arrow walk indexes into its children, and out of the buttons because
       * text inside one joins its accessible name. `hidden` still resolves for
       * `aria-describedby`, unlike the `title` it backs up.
       */}
      {reasons.length > 0 && (
        <div hidden>
          {reasons.map((t) => (
            <span key={t.key} id={reasonId(prefix, t.key)}>
              {t.disabledReason}
            </span>
          ))}
        </div>
      )}
      <div
        role="tablist"
        aria-label={label}
        className={`flex flex-none items-center border-b border-border-default ${ROW[size]} ${className}`}
      >
        {tabs.map((t, at) => {
          const selected = t.key === value;
          const why = t.disabledReason;

          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={tabId(prefix, t.key)}
              aria-selected={selected}
              // A disabled tab has no panel behind it, so it points at none.
              aria-controls={why === undefined ? tabPanelId(prefix, t.key) : undefined}
              aria-disabled={why !== undefined || undefined}
              aria-describedby={why !== undefined ? reasonId(prefix, t.key) : undefined}
              title={why}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                if (why === undefined) onChange(t.key);
              }}
              onKeyDown={(e) => onKeyDown(e, at)}
              className={`flex h-full items-center gap-1.5 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] ${
                why !== undefined
                  ? "cursor-not-allowed border-b-transparent text-faint"
                  : selected
                    ? "cursor-pointer border-b-accent font-semibold text-accent"
                    : "cursor-pointer border-b-transparent text-muted hover:text-body"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className="font-mono text-[.6875rem] font-normal text-faint">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

/**
 * The panel a tab opens, labelled by that tab. `focusable` gives it a tab stop for
 * content with nothing focusable inside, so the keyboard can still scroll it. Layout
 * is the host's: pass the sizing and scrolling classes in `className`.
 */
export function TabPanel({
  idPrefix,
  tab,
  focusable = false,
  className = "",
  children,
}: {
  /** The prefix handed to `Tabs`. */
  idPrefix: string;
  /** Key of the tab this panel belongs to. */
  tab: string;
  focusable?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={tabPanelId(idPrefix, tab)}
      role="tabpanel"
      aria-labelledby={tabId(idPrefix, tab)}
      tabIndex={focusable ? 0 : undefined}
      className={className}
    >
      {children}
    </div>
  );
}
