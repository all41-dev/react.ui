import { CountBadge, type CountBadgeTone } from "../../components/CountBadge";
import { KeyValue, type KeyValueTone } from "../../components/KeyValue";

const BADGE_TONES: CountBadgeTone[] = ["neutral", "accent", "danger"];
const VALUE_TONES: (KeyValueTone | undefined)[] = [undefined, "accent", "faint", "danger"];

export function BadgesDemo() {
  return (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Count badge and key–value</h2>
        <p className="text-muted">
          Two small pieces for a header line or a list row. <code>CountBadge</code> puts a
          number in a pill; <code>KeyValue</code> sets a label beside the value it names.
          The <code>danger</code> tone of both mixes toward the body text so it keeps its
          contrast at these sizes.
        </p>
      </div>

      <section className="rounded-surface border border-border-default bg-surface-card p-4">
        <h3 className="mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
          CountBadge — tones × sizes
        </h3>
        <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-6 gap-y-3 text-[.8125rem]">
          <span />
          <span className="text-faint">sm</span>
          <span className="text-faint">md</span>
          {BADGE_TONES.map((tone) => (
            <div key={tone} className="contents">
              <span className="text-muted">{tone}</span>
              <span>
                <CountBadge count={7} tone={tone} size="sm" />
              </span>
              <span>
                <CountBadge count={128} tone={tone} title={`${tone} badge`} />
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[.6875rem] text-faint">In a row:</p>
        <ul className="mt-1 max-w-sm divide-y divide-border-default rounded-control border border-border-default">
          {[
            ["Suppliers", 0],
            ["Customers", 3],
            ["Invoices", 41],
          ].map(([name, errors]) => (
            <li key={name} className="flex items-center gap-2 px-3 py-2 text-[.8125rem]">
              <span className="flex-1">{name}</span>
              {errors ? <CountBadge count={errors as number} tone="danger" size="sm" /> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-surface border border-border-default bg-surface-card p-4">
        <h3 className="mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint">
          KeyValue — tones, mono, title
        </h3>
        <div className="flex flex-wrap items-center gap-6">
          {VALUE_TONES.map((tone) => (
            <KeyValue
              key={tone ?? "body"}
              label={tone ?? "body"}
              value={tone === "danger" ? "3" : "Enabled"}
              tone={tone}
              mono={tone === "danger"}
            />
          ))}
        </div>

        <p className="mt-4 text-[.6875rem] text-faint">A summary line:</p>
        <div className="mt-1 flex items-center gap-5 rounded-control border border-border-default px-3 py-2">
          <KeyValue label="State" value="Enabled" tone="accent" />
          <KeyValue label="Code" value="supplier.v1" mono />
          <KeyValue
            label="Flow"
            value="2 read → 1 write"
            title="Readers polling records out, and writers receiving them."
          />
          <KeyValue label="In error" value="1" mono tone="danger" />
        </div>
      </section>
    </div>
  );
}
