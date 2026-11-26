import { LocationTrail, type TrailSegment } from "../../components/LocationTrail";

const HEADING = "mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint";
const CARD = "rounded-surface border border-border-default bg-surface-card p-4";

const PATH: TrailSegment[] = [
  { key: "partner", label: "Northwind", className: "shrink-0 max-w-40" },
  { key: "customer", label: "Contoso Retail", className: "shrink-0 max-w-48" },
  { key: "area", label: "Workbench", minWidth: "md" },
  { key: "group", label: "Exchanges", minWidth: "lg" },
  { key: "object", label: "INVOICE_OUT", mono: true, title: "INVOICE_OUT", className: "max-w-64" },
];

const WITH_NODE: TrailSegment[] = [
  { key: "area", label: "Settings" },
  {
    key: "scope",
    node: (
      <button
        type="button"
        className="cursor-pointer truncate rounded-sm underline decoration-dotted underline-offset-2 hover:text-body"
      >
        Contoso Retail
      </button>
    ),
  },
  { key: "page", node: <h2 className="truncate text-body">Parameters</h2> },
];

export function TrailDemo() {
  return (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Location trail</h2>
        <p className="text-muted">
          <code>LocationTrail</code> says where the viewer is: an ordered list of segments
          between chevrons, the last one marked <code>aria-current=&quot;location&quot;</code>. It
          never navigates; a segment that has to be interactive is handed in as a{" "}
          <code>node</code>.
        </p>
      </div>

      <section className={CARD}>
        <h3 className={HEADING}>strip — a row of its own; segments collapse below md and lg</h3>
        <LocationTrail segments={PATH} />
        <p className="mt-3 text-[.8125rem] text-muted">
          Narrow the window: Exchanges goes below <code>lg</code>, Workbench below <code>md</code>;
          the first two never shrink and the last truncates.
        </p>
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>bar — inline in a toolbar</h3>
        <div className="flex h-9 items-center rounded-control border border-border-default px-3">
          <LocationTrail segments={PATH.slice(1)} variant="bar" />
        </div>
      </section>

      <section className={CARD}>
        <h3 className={HEADING}>segments as nodes — a button, a heading</h3>
        <LocationTrail segments={WITH_NODE} variant="bar" />
      </section>
    </div>
  );
}
