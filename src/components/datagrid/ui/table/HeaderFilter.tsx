import type { Column, Header } from "@tanstack/react-table";
import type { ColumnFilterMeta, ColumnMeta } from "../../types/column";
import type { SelectOption } from "../../types/column";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

const baseControl =
  "block w-full h-8 rounded-md border border-gray-300 bg-white text-xs text-gray-800 " +
  "shadow-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200";

const inputClass = `${baseControl} px-2`;
const selectClass = `${baseControl} appearance-none pl-2 pr-6`;

type FilterOf<K extends ColumnFilterMeta["type"]> = Extract<ColumnFilterMeta, { type: K }>;

type FilterProps<TRow extends object, K extends ColumnFilterMeta["type"]> = {
  col: Column<TRow, unknown>;
  cfg: FilterOf<K>;
};

/**
 * Each filter kind is its own component so its hooks run unconditionally.
 * Previously all of these lived in one function behind `if (cfg.type === …)`
 * branches, after an early `return null` — a rules-of-hooks violation that
 * crashed with "rendered fewer hooks than expected" as soon as a column's
 * filter config or `getCanFilter()` changed at runtime.
 */
function TextFilter<TRow extends object>({ col, cfg }: FilterProps<TRow, "text">) {
  const external = (col.getFilterValue() as string) ?? "";
  const [input, setInput] = useState(external);
  const [lastExternal, setLastExternal] = useState(external);
  const debounced = useDebounced(input, cfg.debounceMs ?? 250);

  // Reconcile an external change (e.g. "clear all filters") during render rather
  // than in an effect — see react.dev "adjusting state when a prop changes".
  if (external !== lastExternal) {
    setLastExternal(external);
    setInput(external);
  }

  useEffect(() => {
    col.setFilterValue(debounced || undefined);
  }, [col, debounced]);

  return (
    <div className="mt-1">
      <input
        className={inputClass}
        placeholder={cfg.placeholder ?? "Filter…"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
    </div>
  );
}

function SelectFilter<TRow extends object>({ col, cfg }: FilterProps<TRow, "select">) {
  const raw = col.getFilterValue();
  const opts = cfg.options ?? ([] as SelectOption[]);

  if (cfg.multi) {
    const val = (Array.isArray(raw) ? raw : []) as string[];
    return (
      <div className="mt-1">
        <select
          multiple
          className={inputClass + " !h-auto"}
          value={val}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
            col.setFilterValue(selected.length ? selected : undefined);
          }}
          size={Math.min(5, Math.max(3, opts.length))}
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const val = (raw as string) ?? "";
  return (
    <div className="mt-1 relative">
      <select
        className={selectClass}
        value={val}
        onChange={(e) => {
          const v = e.target.value;
          col.setFilterValue(v ? v : undefined);
        }}
      >
        <option value="">{cfg.placeholder ?? "Any"}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-gray-400">
        <ChevronDown className="h-3 w-3" aria-hidden />
      </span>
    </div>
  );
}

function BooleanFilter<TRow extends object>({ col, cfg }: FilterProps<TRow, "boolean">) {
  const raw = col.getFilterValue();
  const labels = {
    any: "Any",
    true: "Yes",
    false: "No",
    ...(cfg.labels ?? {}),
  };
  const val = raw === true ? "true" : raw === false ? "false" : "";

  return (
    <div className="mt-1 relative">
      <select
        className={selectClass}
        value={val}
        onChange={(e) => {
          const v = e.target.value;
          col.setFilterValue(v === "" ? undefined : v === "true");
        }}
      >
        <option value="">{labels.any}</option>
        <option value="true">{labels.true}</option>
        <option value="false">{labels.false}</option>
      </select>

      <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-gray-400">
        <ChevronDown className="h-3 w-3" aria-hidden />
      </span>
    </div>
  );
}

function DateRangeFilter<TRow extends object>({ col, cfg }: FilterProps<TRow, "dateRange">) {
  const v = (col.getFilterValue() as { from?: string; to?: string }) ?? {};
  const from = v.from ?? "";
  const to = v.to ?? "";

  const push = (next: { from?: string; to?: string }) => {
    if (!next.from && !next.to) col.setFilterValue(undefined);
    else col.setFilterValue(next);
  };

  return (
    <div className="mt-1 flex gap-1">
      <input
        type="date"
        className={inputClass}
        placeholder={cfg.placeholders?.from ?? "From"}
        value={from}
        onChange={(e) => push({ ...v, from: e.target.value || undefined })}
      />
      <input
        type="date"
        className={inputClass}
        placeholder={cfg.placeholders?.to ?? "To"}
        value={to}
        onChange={(e) => push({ ...v, to: e.target.value || undefined })}
      />
    </div>
  );
}

export function HeaderFilter<TRow extends object>({ h }: { h: Header<TRow, unknown> }) {
  const col = h.column;
  const meta = (col.columnDef as { meta?: ColumnMeta<TRow, any> }).meta;
  const cfg = meta?.filter;
  if (!cfg || !col.getCanFilter()) return null;

  switch (cfg.type) {
    case "text":
      return <TextFilter col={col} cfg={cfg} />;
    case "select":
      return <SelectFilter col={col} cfg={cfg} />;
    case "boolean":
      return <BooleanFilter col={col} cfg={cfg} />;
    case "dateRange":
      return <DateRangeFilter col={col} cfg={cfg} />;
    default:
      return null;
  }
}
