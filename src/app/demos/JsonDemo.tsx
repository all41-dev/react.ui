import { JsonButton } from "../../components/json/JsonButton";
import { JsonInspectorProvider } from "../../components/json/JsonInspectorProvider";

const HEADING = "mb-3 text-[.6875rem] font-bold uppercase tracking-[.06em] text-faint";
const CARD = "rounded-surface border border-border-default bg-surface-card p-4";

const RECORD = {
  uuid: "7f3c1a52-9d0e-4b7a-8c11-2f6f0e9a4d31",
  name: "Contoso Retail",
  enabled: true,
  contacts: [{ name: "Ada", role: "Buyer" }],
};

const BODY = "function map(record) {\n  return record.contacts[0].name;\n}";

const ROWS = [
  { id: "inv", name: "Invoices", value: { code: "INVOICE_OUT", legs: 2 } },
  { id: "sup", name: "Suppliers", value: { code: "SUPPLIER", legs: 3 } },
];

export function JsonDemo() {
  return (
    <JsonInspectorProvider>
      <div className="space-y-8 p-4">
        <div>
          <h2 className="mb-2 text-2xl font-bold">JSON inspector</h2>
          <p className="text-muted">
            One drawer per app, owned by <code>JsonInspectorProvider</code> and opened from
            anywhere by a <code>JsonButton</code> or through <code>useJsonInspector</code>. An
            object shows as formatted JSON, a string as it is, in the grammar named. Escape,
            the scrim or the close button closes it, and focus returns to the opener.
          </p>
        </div>

        <section className={CARD}>
          <h3 className={HEADING}>JsonButton — label, chip, icon</h3>
          <div className="flex items-center gap-4">
            <JsonButton target={{ title: "Contoso Retail", kind: "Customers", value: RECORD }} />
            <JsonButton variant="chip" target={{ title: "Contoso Retail", kind: "Customers", value: RECORD }} />
            <JsonButton variant="icon" target={{ title: "Contoso Retail", kind: "Customers", value: RECORD }} />
          </div>
        </section>

        <section className={CARD}>
          <h3 className={HEADING}>A string value, in its grammar</h3>
          <JsonButton
            variant="chip"
            target={{ title: "Contact name", kind: "Function", value: BODY, language: "javascript" }}
          />
        </section>

        <section className={CARD}>
          <h3 className={HEADING}>Inside a row that reacts to a click</h3>
          <ul className="max-w-sm divide-y divide-border-default rounded-control border border-border-default">
            {ROWS.map((row) => (
              <li key={row.id}>
                {/* The button stops its click, so the row's own handler does not run. */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => alert(`Row ${row.name} clicked`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") alert(`Row ${row.name} clicked`);
                  }}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[.8125rem] hover:bg-surface-raised"
                >
                  <span className="flex-1">{row.name}</span>
                  <JsonButton variant="icon" target={{ title: row.name, kind: "Exchanges", value: row.value }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </JsonInspectorProvider>
  );
}
