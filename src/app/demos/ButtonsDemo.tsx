import { useState } from "react";
import { Copy, FileInput, Link2, Trash2 } from "lucide-react";

import { chipClass, DisclosureButton } from "../../components/DisclosureButton";
import { IconButton } from "../../components/IconButton";
import { InfoHint } from "../../components/InfoHint";
import { SegmentedSwitch, type SegmentOption } from "../../components/SegmentedSwitch";

type View = "open" | "faults" | "held" | "all";
type Mode = "monitor" | "configure";

const VIEWS: SegmentOption<View>[] = [
  { value: "open", label: "Open" },
  { value: "faults", label: "Faults" },
  { value: "held", label: "Held", disabled: true, title: "Nothing is held" },
  { value: "all", label: "All" },
];

const HEADING = "mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint";
const CARD = "rounded-surface border border-border-default bg-surface-card p-4";

export function ButtonsDemo() {
  const [view, setView] = useState<View>("open");
  const [mode, setMode] = useState<Mode>("monitor");
  const [asked, setAsked] = useState<Mode | null>(null);
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Configure answers after a second, as a mode that waits on a server would.
  const choose = (next: Mode) => {
    if (next === "monitor") return setMode(next);
    setAsked(next);
    setTimeout(() => {
      setMode(next);
      setAsked(null);
    }, 1000);
  };

  return (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Buttons and hints</h2>
        <p className="text-muted">
          Four small controls for a header or a bar. <code>IconButton</code> is a named
          square icon; <code>InfoHint</code> keeps a sentence behind an icon;{" "}
          <code>DisclosureButton</code> unfolds a region; <code>SegmentedSwitch</code>{" "}
          picks one of a few.
        </p>
      </div>

      <section className={CARD}>
        <h3 className={HEADING}>IconButton — md, sm, disabled</h3>
        <div className="flex items-center gap-2">
          <IconButton label="Copy">
            <Copy size={14} aria-hidden="true" />
          </IconButton>
          <IconButton label="Import from a file">
            <FileInput size={14} aria-hidden="true" />
          </IconButton>
          <IconButton label="Copy" size="sm">
            <Copy size={13} aria-hidden="true" />
          </IconButton>
          <IconButton label="Delete" title="Three maps still use it" disabled>
            <Trash2 size={14} aria-hidden="true" />
          </IconButton>
        </div>
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>InfoHint — beside a title</h3>
        <div className="flex items-center gap-2">
          <span className="text-[.8125rem] font-semibold">Shape</span>
          <InfoHint text="? marks an optional property, [ ] an array of. Read-only." />
          <span className="ml-6 text-[.8125rem] font-semibold">Parameters</span>
          <InfoHint place="right" text="Apply to every module of the instance." />
        </div>
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>DisclosureButton — closed, open, unsaved</h3>
        <div className="flex items-center gap-2">
          <DisclosureButton
            open={open}
            dirty={dirty}
            controls="buttons-demo-region"
            onToggle={() => setOpen((v) => !v)}
          >
            Details
          </DisclosureButton>
          <button type="button" className={`${chipClass} text-muted hover:text-body`}>
            JSON
          </button>
          <label className="ml-4 flex items-center gap-1.5 text-[.75rem] text-muted">
            <input
              type="checkbox"
              checked={dirty}
              onChange={(e) => setDirty(e.target.checked)}
            />
            unsaved work
          </label>
        </div>
        {open && (
          <p id="buttons-demo-region" className="mt-3 text-[.8125rem] text-muted">
            The region the button unfolds. The chip beside it uses <code>chipClass</code>.
          </p>
        )}
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>SegmentedSwitch — a view, a mode that waits, a trailing control</h3>
        <div className="flex flex-wrap items-center gap-6">
          <SegmentedSwitch label="View" value={view} options={VIEWS} onChange={setView} />
          <SegmentedSwitch
            label="Mode"
            value={mode}
            activateOnArrow={false}
            options={[
              { value: "monitor", label: "Monitor" },
              { value: "configure", label: "Configure", busy: asked === "configure" },
            ]}
            onChange={choose}
            trailing={
              <button
                type="button"
                title="Link"
                className="flex h-full cursor-pointer items-center gap-1 rounded border-0 bg-transparent px-2 text-faint hover:text-body"
              >
                <Link2 size={12} aria-hidden="true" />
                Direct
              </button>
            }
          />
        </div>
        <p className="mt-3 text-[.6875rem] text-faint">
          The arrows choose in the first and only move in the second, where Space or Enter
          chooses. Choosing changes no width.
        </p>
      </section>
    </div>
  );
}
