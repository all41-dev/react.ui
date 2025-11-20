import type { Header } from "@tanstack/react-table";
import type { ColumnMeta } from "../../types/column";
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

export function HeaderFilter<TRow extends object>({
  h,
}: {
  h: Header<TRow, unknown>;
}) {
  const col = h.column;
  const meta = (col.columnDef as any).meta as ColumnMeta<TRow, any> | undefined;
  const cfg = meta?.filter;
  if (!cfg || !col.getCanFilter()) return null;

  const raw = col.getFilterValue();

  // TEXT ------------------------------
  if (cfg.type === "text") {
    const [input, setInput] = useState<string>((raw as string) ?? "");
    const debounced = useDebounced(input, cfg.debounceMs ?? 250);

    useEffect(() => {
      col.setFilterValue(debounced || undefined);
    }, [debounced]);

    useEffect(() => {
      if ((raw ?? "") !== input) setInput((raw as string) ?? "");
    }, [raw]);

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

  // SELECT ------------------------------
  if (cfg.type === "select") {
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
              const selected = Array.from(e.target.selectedOptions).map(
                (o) => o.value
              );
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
    } else {
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
  }

  // BOOLEAN ------------------------------
  if (cfg.type === "boolean") {
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

  // DATE RANGE ------------------------------
  if (cfg.type === "dateRange") {
    const v = (raw as { from?: string; to?: string }) ?? {};
    const from = v.from ?? "";
    const to = v.to ?? "";
    return (
      <div className="mt-1 flex gap-1">
        <input
          type="date"
          className={inputClass}
          placeholder={cfg.placeholders?.from ?? "From"}
          value={from}
          onChange={(e) => {
            const next = { ...v, from: e.target.value || undefined };
            if (!next.from && !next.to) col.setFilterValue(undefined);
            else col.setFilterValue(next);
          }}
        />
        <input
          type="date"
          className={inputClass}
          placeholder={cfg.placeholders?.to ?? "To"}
          value={to}
          onChange={(e) => {
            const next = { ...v, to: e.target.value || undefined };
            if (!next.from && !next.to) col.setFilterValue(undefined);
            else col.setFilterValue(next);
          }}
        />
      </div>
    );
  }

  return null;
}
