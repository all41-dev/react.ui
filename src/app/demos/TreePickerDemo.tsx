import { Unlink } from "lucide-react";
import { useMemo, useState } from "react";

import { TreePicker } from "../../components/treePicker/TreePicker";
import type { TreePickerRow } from "../../components/treePicker/treeRows";

/*
 * Two pickers side by side, paired by the demo's own rules: a click arms a leaf, the
 * other side's leaves at the same depth light up, a second click pairs them. The
 * component knows none of this; it draws what each row says.
 */

type Side = "source" | "target";
type Node = { id: string; parentId: string | null; name: string; kind: "leaf" | "object" | "array" | "group"; depth: number };

const SOURCE: Node[] = [
  { id: "customer", parentId: null, name: "customer", kind: "object", depth: 0 },
  { id: "customer.name", parentId: "customer", name: "name", kind: "leaf", depth: 1 },
  { id: "customer.email", parentId: "customer", name: "email", kind: "leaf", depth: 1 },
  { id: "lines", parentId: null, name: "lines", kind: "array", depth: 0 },
  { id: "lines.sku", parentId: "lines", name: "sku", kind: "leaf", depth: 1 },
  { id: "lines.qty", parentId: "lines", name: "qty", kind: "leaf", depth: 1 },
  { id: "total", parentId: null, name: "total", kind: "leaf", depth: 0 },
  { id: "nis", parentId: null, name: "Not in the schema", kind: "group", depth: 0 },
  { id: "legacy_ref", parentId: "nis", name: "legacy_ref", kind: "leaf", depth: 1 },
];

const TARGET: Node[] = [
  { id: "CUSTOMER", parentId: null, name: "CUSTOMER", kind: "object", depth: 0 },
  { id: "CUSTOMER.NAME", parentId: "CUSTOMER", name: "NAME", kind: "leaf", depth: 1 },
  { id: "CUSTOMER.MAIL", parentId: "CUSTOMER", name: "MAIL", kind: "leaf", depth: 1 },
  { id: "LINES", parentId: null, name: "LINES", kind: "array", depth: 0 },
  { id: "LINES.SKU", parentId: "LINES", name: "SKU", kind: "leaf", depth: 1 },
  { id: "LINES.QTY", parentId: "LINES", name: "QTY", kind: "leaf", depth: 1 },
  { id: "TOTAL", parentId: null, name: "TOTAL", kind: "leaf", depth: 0 },
  { id: "CREATED", parentId: null, name: "CREATED", kind: "leaf", depth: 0 },
];

const tail = (id: string) => id.split(".").pop() ?? id;

export function TreePickerDemo() {
  const [pairs, setPairs] = useState<Record<string, string>>({ total: "TOTAL" });
  const [armed, setArmed] = useState<{ side: Side; id: string } | null>(null);
  const [note, setNote] = useState("Click a field, then its counterpart on the other side.");

  const targetOf = pairs;
  const sourceOf = useMemo(
    () => Object.fromEntries(Object.entries(pairs).map(([s, t]) => [t, s])),
    [pairs]
  );

  const rowsFor = (side: Side): TreePickerRow[] => {
    const nodes = side === "source" ? SOURCE : TARGET;
    const paired = side === "source" ? targetOf : sourceOf;
    const otherArmed = armed && armed.side !== side ? armed : null;
    const armedNode = otherArmed
      ? (otherArmed.side === "source" ? SOURCE : TARGET).find((n) => n.id === otherArmed.id)
      : null;
    return nodes.map((n) => {
      if (n.kind === "group") return { id: n.id, parentId: n.parentId, kind: "group", name: n.name };
      const counterpart = paired[n.id];
      const isArmed = armed?.side === side && armed.id === n.id;
      const eligible = !!armedNode && n.kind === "leaf" && n.depth === armedNode.depth && !counterpart;
      const dim = !!otherArmed && !eligible;
      const tag = counterpart
        ? `${side === "source" ? "→" : "←"} ${tail(counterpart)}`
        : isArmed
          ? "picking…"
          : n.kind === "leaf"
            ? "unmapped"
            : undefined;
      return {
        id: n.id,
        parentId: n.parentId,
        kind: n.kind,
        name: n.name,
        tag,
        tagTone: counterpart || isArmed || eligible ? "accent" : "warning",
        tone: eligible ? "accent" : undefined,
        dot: n.kind === "leaf" && n.id !== "legacy_ref" ? (counterpart ? "accent" : "warning") : undefined,
        dim: dim || n.id === "legacy_ref",
        state: isArmed ? "armed" : undefined,
        actions: counterpart ? (
          <button
            type="button"
            aria-label={`Unpair ${n.name}`}
            title="Unpair"
            onClick={() => {
              const source = side === "source" ? n.id : counterpart;
              setPairs((prev) => {
                const next = { ...prev };
                delete next[source];
                return next;
              });
              setNote(`${tail(source)} and ${tail(pairs[source])} unpaired.`);
            }}
            className="grid h-5 w-5 cursor-pointer place-items-center rounded-sm border-0 bg-transparent p-0 text-faint hover:text-danger"
          >
            <Unlink className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : undefined,
      };
    });
  };

  const pick = (side: Side) => (row: TreePickerRow) => {
    if (row.kind !== "leaf") {
      setNote("Open a level with its chevron; only fields pair here.");
      return;
    }
    if (armed && armed.side === side) {
      setArmed(armed.id === row.id ? null : { side, id: row.id });
      setNote(armed.id === row.id ? "Nothing armed." : `Now pick the counterpart of ${row.name}.`);
      return;
    }
    if (armed) {
      if (row.dim) {
        setNote(`Only an unpaired field at the same level can pair with ${tail(armed.id)}.`);
        return;
      }
      const source = side === "source" ? row.id : armed.id;
      const target = side === "source" ? armed.id : row.id;
      setPairs((prev) => ({ ...prev, [source]: target }));
      setArmed(null);
      setNote(`${tail(source)} ↔ ${tail(target)} paired.`);
      return;
    }
    setArmed({ side, id: row.id });
    setNote(`Now pick the counterpart of ${row.name} on the other side.`);
  };

  const count = (side: Side) => {
    const nodes = side === "source" ? SOURCE : TARGET;
    const leaves = nodes.filter((n) => n.kind === "leaf" && n.parentId !== "nis");
    const paired = side === "source" ? Object.keys(pairs) : Object.values(pairs);
    return `${paired.length}/${leaves.length}`;
  };

  const header = (title: string, side: Side) => (
    <div className="mb-1.5 flex items-center gap-2 text-[.8125rem] font-semibold">
      <span>{title}</span>
      <span className="ml-auto font-mono text-[.625rem] font-normal text-faint">{count(side)}</span>
    </div>
  );

  return (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Tree picker</h2>
        <p className="text-muted">
          A compact tree list driven by a flat, parent-linked row list: search, expand and
          collapse, and per row an icon by kind, a name, a tag, a dot, a dim state, an
          <code> armed</code> or <code>selected</code> state and trailing actions. A{" "}
          <code>group</code> row is a heading. One tab stop: the arrows walk the visible
          rows, Right and Left open and close, Enter and Space pick. The pairing below is
          the demo&apos;s own logic, not the component&apos;s.
        </p>
      </div>

      <section className="rounded-surface border border-border-default bg-surface-card p-4">
        <p className="mb-3 text-xs text-muted" aria-live="polite">
          {note}
        </p>
        <div className="grid h-80 grid-cols-2 gap-4">
          <div className="min-h-0 rounded-control border border-border-default bg-surface-inset/40 p-2">
            <TreePicker
              rows={rowsFor("source")}
              onPick={pick("source")}
              label="Source record"
              header={header("Source record", "source")}
              searchPlaceholder="Find a source field…"
              fill
            />
          </div>
          <div className="min-h-0 rounded-control border border-border-default bg-surface-inset/40 p-2">
            <TreePicker
              rows={rowsFor("target")}
              onPick={pick("target")}
              label="Target record"
              header={header("Target record", "target")}
              searchPlaceholder="Find a target field…"
              fill
            />
          </div>
        </div>
      </section>

      <section className="rounded-surface border border-border-default bg-surface-card p-4">
        <h3 className="mb-3 text-[.6875rem] font-bold tracking-[.06em] text-faint uppercase">
          Empty and controlled
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <TreePicker rows={[]} onPick={() => undefined} label="Empty" emptyLabel="No field list yet" search={false} />
          <TreePicker
            rows={rowsFor("target")}
            onPick={() => undefined}
            label="Collapsed"
            expanded={new Set()}
            onExpandedChange={() => undefined}
            search={false}
          />
        </div>
      </section>
    </div>
  );
}
