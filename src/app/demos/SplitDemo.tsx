import { useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";

import { SplitPane } from "../../components/split/SplitPane";
import { SplitRow } from "../../components/split/SplitRow";
import { usePaneOrder } from "../../components/split/usePaneOrder";

const HEADING = "mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint";
const CARD = "rounded-surface border border-border-default bg-surface-card p-4";
const PANE =
  "flex min-h-0 min-w-0 flex-1 basis-0 flex-col gap-1 rounded-surface border border-border-default bg-surface-inset p-3 text-[.8125rem]";

const ROW_IDS = ["source", "pairs", "target"] as const;
type RowId = (typeof ROW_IDS)[number];
const ROW_LABELS: Record<RowId, string> = { source: "Source", pairs: "Pairs", target: "Target" };

function Pane({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className={PANE}>
      <div className="flex items-center gap-2 font-semibold">{title}</div>
      <p className="text-muted">{children}</p>
    </div>
  );
}

export function SplitDemo() {
  const [folded, setFolded] = useState(false);
  const [settled, setSettled] = useState("nothing yet");
  const [rowFolded, setRowFolded] = useState<Partial<Record<RowId, boolean>>>({});
  const paneOrder = usePaneOrder({ ids: ROW_IDS, labels: ROW_LABELS, storageKey: "demo-split-row-order" });

  const grip = (id: RowId) => (
    <button
      type="button"
      {...paneOrder.gripProps(id)}
      title="Drag, or move with the arrow keys"
      className="flex size-5 flex-none cursor-grab items-center justify-center rounded-sm text-faint hover:text-body active:cursor-grabbing"
    >
      <GripVertical size={12} aria-hidden="true" />
    </button>
  );

  const rowPane = (id: RowId) =>
    rowFolded[id] ? (
      <div className="flex h-full w-9 flex-col items-center gap-2 rounded-surface border border-border-default bg-surface-inset py-2">
        {grip(id)}
        <button
          type="button"
          onClick={() => setRowFolded((prev) => ({ ...prev, [id]: false }))}
          className="flex-1 cursor-pointer text-[.625rem] font-semibold uppercase tracking-[.06em] text-faint [writing-mode:vertical-rl] hover:text-body"
        >
          {ROW_LABELS[id]}
        </button>
      </div>
    ) : (
      <Pane
        title={
          <>
            {grip(id)}
            {ROW_LABELS[id]}
            <button
              type="button"
              onClick={() => setRowFolded((prev) => ({ ...prev, [id]: true }))}
              className="ml-auto cursor-pointer text-xs font-normal text-muted hover:text-body"
            >
              Fold
            </button>
          </>
        }
      >
        Drag the grip onto another pane, or focus it and press an arrow key.
      </Pane>
    );

  return (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Split panes</h2>
        <p className="text-muted">
          <code>SplitPane</code> divides a box between its children through draggable
          dividers; <code>SplitRow</code> adds an order the user changes, from{" "}
          <code>usePaneOrder</code>. A divider moves with the pointer and the arrow keys
          (Shift for a longer step, Home and End to a minimum); Enter or a double-click puts
          every pane back.
        </p>
      </div>

      <section className={CARD}>
        <h3 className={HEADING}>SplitPane — two panes, stacked, remembered</h3>
        <label className="mb-3 flex items-center gap-2 text-[.8125rem]">
          <input type="checkbox" checked={folded} onChange={(e) => setFolded(e.target.checked)} />
          Fold the first pane
        </label>
        <SplitPane
          className="h-72"
          label="Resize the table and the editor"
          storageKey="demo-split-stacked"
          defaultSizes={[0.4, 0.6]}
          mins={[64, 96]}
          collapsed={[folded, false]}
        >
          {folded ? (
            <div className="rounded-surface border border-border-default bg-surface-inset px-3 py-2 text-[.8125rem] font-semibold">
              Table
            </div>
          ) : (
            <Pane title="Table">Keeps 64px. Its share is stored under one key and read back on a reload.</Pane>
          )}
          <Pane title="Editor">Keeps 96px, and takes the room while the table is folded.</Pane>
        </SplitPane>
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>SplitPane — three panes, side by side, controlled</h3>
        <SplitPane
          direction="horizontal"
          className="h-40"
          label={(index) => `Resize pane ${index + 1}`}
          defaultSizes={[0.25, 0.5, 0.25]}
          mins={120}
          onSizesCommit={(sizes) => setSettled(sizes ? sizes.join(" · ") : "reset")}
        >
          <Pane title="One">A divider moves the two panes around it.</Pane>
          <Pane title="Two">The third keeps its width while the first divider moves.</Pane>
          <Pane title="Three">Each keeps 120px.</Pane>
        </SplitPane>
        <p className="mt-3 text-[.8125rem] text-muted">
          Last gesture settled at: <span className="font-mono">{settled}</span>
        </p>
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>SplitRow — reorder, resize, fold</h3>
        <div role="status" aria-live="polite" className="sr-only">
          {paneOrder.announcement}
        </div>
        <SplitRow
          className="h-48"
          paneOrder={paneOrder}
          storageKey="demo-split-row-sizes"
          defaultSizes={{ source: 0.25, pairs: 0.5, target: 0.25 }}
          mins={{ source: 140, pairs: 200, target: 140 }}
          collapsed={rowFolded}
          gap={14}
          panes={{ source: rowPane("source"), pairs: rowPane("pairs"), target: rowPane("target") }}
        />
        <p className="mt-3 text-[.8125rem] text-muted">
          Order: <span className="font-mono">{paneOrder.order.join(" · ")}</span>. A pane keeps
          its width through a move; Enter on a grip resets the order.
        </p>
      </section>
    </div>
  );
}
