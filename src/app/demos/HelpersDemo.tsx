import { useState } from "react";

import { useCssBreakpoint } from "../../hooks/useCssBreakpoint";
import { useFlyoutDialog } from "../../hooks/useFlyoutDialog";
import { copyText } from "../../utils/clipboard";
import { humanizeCron, isCron } from "../../utils/cron";
import { formatDateTime, humanizeCode, humanizeDuration, relativeTime } from "../../utils/humanize";
import { idEq } from "../../utils/id";
import { sortTree } from "../../utils/sortTree";

const HEADING = "mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint";
const CARD = "rounded-surface border border-border-default bg-surface-card p-4";
const BUTTON =
  "h-8 cursor-pointer rounded-control border border-border-default px-3 text-[.8125rem] hover:bg-surface-raised";
const INPUT = "h-8 rounded-control border border-border-default bg-transparent px-2 text-[.8125rem]";

type Node = { id: string; parentId: string | null; name: string };
const NODES: Node[] = [
  { id: "lines", parentId: null, name: "lines" },
  { id: "item10", parentId: "lines", name: "item10" },
  { id: "item2", parentId: "lines", name: "item2" },
  { id: "customer", parentId: null, name: "Customer" },
  { id: "name", parentId: "customer", name: "name" },
  { id: "id", parentId: "customer", name: "Id" },
];
const depthOf = (node: Node) => (node.parentId === null ? 0 : 1);

const AN_HOUR_AGO = new Date(Date.now() - 3_600_000).toISOString();

export function HelpersDemo() {
  const [open, setOpen] = useState(false);
  const { slotRef, panelRef, onKeyDown } = useFlyoutDialog(open, () => setOpen(false));
  const { ref: wideRef, matches: wide } = useCssBreakpoint();
  const [copied, setCopied] = useState<boolean | null>(null);
  const [cron, setCron] = useState("0 23 * * MON-FRI");

  return (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Hooks and helpers</h2>
        <p className="text-muted">
          Two hooks and a few functions with no markup of their own:{" "}
          <code>useFlyoutDialog</code>, <code>useCssBreakpoint</code>, <code>copyText</code>,{" "}
          <code>sortTree</code>, <code>idEq</code>, the readers of <code>humanize</code>, and
          the cron readers from the <code>cron</code> entry.
        </p>
      </div>

      <section className={CARD}>
        <h3 className={HEADING}>useFlyoutDialog — focus kept inside, Escape and an outside press close</h3>
        <div ref={slotRef} className="relative inline-block">
          <button type="button" className={BUTTON} aria-expanded={open} onClick={() => setOpen((was) => !was)}>
            Open the panel
          </button>
          {open && (
            // The key handler traps Tab and reads Escape for the whole panel.
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Example panel"
              onKeyDown={onKeyDown}
              className="absolute left-0 top-10 z-10 flex w-64 flex-col gap-2 rounded-surface border border-border-default bg-surface-card p-3 shadow-lg"
            >
              <button type="button" className={BUTTON}>
                First
              </button>
              <input data-autofocus className={INPUT} placeholder="Takes the focus on opening" />
              <button type="button" className={BUTTON} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          )}
        </div>
      </section>

      <section className={`${CARD} @container relative`}>
        <h3 className={HEADING}>useCssBreakpoint — one stylesheet rule, read from JS</h3>
        <div ref={wideRef} aria-hidden="true" className="pointer-events-none absolute hidden size-px @3xl:block" />
        <p className="text-[.8125rem]">
          This card is{" "}
          <span className="font-semibold">{wide ? "at least 48rem wide" : "narrower than 48rem"}</span>, read off
          a sentinel the <code>@3xl</code> rule shows. Resize the window to cross it.
        </p>
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>copyText — the clipboard, with a fallback off https</h3>
        <div className="flex items-center gap-3 text-[.8125rem]">
          <button
            type="button"
            className={BUTTON}
            onClick={() => void copyText("Copied from the sandbox").then(setCopied)}
          >
            Copy a sentence
          </button>
          <span className="text-muted">
            {copied === null ? "Not copied yet" : copied ? "Copied" : "The browser refused"}
          </span>
        </div>
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>sortTree — a flat tree depth-first, siblings in name order</h3>
        <div className="grid grid-cols-2 gap-6 font-mono text-[.8125rem]">
          {[NODES, sortTree(NODES, (node) => node)].map((list, index) => (
            <ul key={index === 0 ? "given" : "sorted"} aria-label={index === 0 ? "As given" : "Sorted"}>
              <li className="mb-1 font-sans text-faint">{index === 0 ? "As given" : "Sorted"}</li>
              {list.map((node) => (
                <li key={node.id} style={{ paddingLeft: depthOf(node) * 16 }}>
                  {node.name}
                </li>
              ))}
            </ul>
          ))}
        </div>
        <p className="mt-3 text-[.8125rem] text-muted">
          <code>idEq(7, &quot;7&quot;)</code> is <span className="font-mono">{String(idEq(7, "7"))}</span>: ids compare as
          text, whichever type they arrived in.
        </p>
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>humanize and cron — machine values as prose</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[.8125rem]">
          <dt className="font-mono text-muted">humanizeCode(&quot;IN_PROGRESS&quot;)</dt>
          <dd>{humanizeCode("IN_PROGRESS")}</dd>
          <dt className="font-mono text-muted">humanizeDuration(266_400_000)</dt>
          <dd>{humanizeDuration(266_400_000)}</dd>
          <dt className="font-mono text-muted">relativeTime(an hour ago)</dt>
          <dd>{relativeTime(AN_HOUR_AGO)}</dd>
          <dt className="font-mono text-muted">formatDateTime(an hour ago)</dt>
          <dd>{formatDateTime(AN_HOUR_AGO)}</dd>
          <dt className="font-mono text-muted">
            <label htmlFor="demo-cron">humanizeCron</label>
          </dt>
          <dd className="flex items-center gap-3">
            <input id="demo-cron" className={`${INPUT} font-mono`} value={cron} onChange={(e) => setCron(e.target.value)} />
            <span>{isCron(cron) ? humanizeCron(cron) : "Not a cron expression"}</span>
          </dd>
        </dl>
      </section>
    </div>
  );
}
