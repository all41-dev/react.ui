import { Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { FacetChip } from "../types/facets";

type SearchBarProps = {
  value: string;
  onChange: (v: string) => void;
  /** Active filters and grouping, shown as pills inside the field. */
  facets: FacetChip[];
  /** The overflow-menu trigger, welded to the right edge. */
  trailing?: ReactNode;
  /** Hides the input and its icon; the pills and trigger still render. */
  searchable?: boolean;
};

/**
 * The grid's primary control: one field holding the search term AND the active criteria,
 * with the menu trigger attached to its right edge as a single unit.
 *
 * The pills used to be a separate band under the toolbar, which spent a whole row on
 * something that belongs in the field it describes. Keeping them here also means the
 * criteria sit where you go to change them.
 */
export function SearchBar({
  value,
  onChange,
  facets,
  trailing,
  searchable = true,
}: SearchBarProps) {
  /* Local echo with a short debounce; external resets (a pill's ×, Clear filters) are
     reconciled during render, the same way HeaderFilter does it. */
  const [input, setInput] = useState(value);
  const [lastExternal, setLastExternal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  if (value !== lastExternal) {
    setLastExternal(value);
    setInput(value);
  }

  useEffect(() => {
    if (input === value) return;
    const id = setTimeout(() => onChange(input), 200);
    return () => clearTimeout(id);
  }, [input, value, onChange]);

  /* Backspace in an empty field removes the last pill — the interaction anyone who has
     used a tag input will try first. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace" || input !== "" || facets.length === 0) return;
    e.preventDefault();
    facets[facets.length - 1].onClear();
  };

  return (
    <div className="flex min-w-0 flex-1 items-stretch">
      <div
        /* The focus ring belongs to the wrapper so the icon and pills sit inside the
           highlighted field. Right side is square — the trigger closes the shape. */
        className={[
          "flex min-h-[30px] min-w-0 flex-1 flex-wrap items-center gap-1.5 border border-border-default bg-surface-inset px-[9px] py-[3px]",
          trailing ? "rounded-l-control border-r-0" : "rounded-control",
          "transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_2px_var(--rui-focus-ring)]",
        ].join(" ")}
        onClick={() => inputRef.current?.focus()}
      >
        {searchable && (
          <Search className="h-3.5 w-3.5 shrink-0 text-faint" aria-hidden />
        )}

        {facets.map((f) => (
          <span
            key={f.id}
            /* Accent-tinted so they read as one family with the engaged menu trigger.
               Clear hovers to accent, not danger — removing a criterion shows you MORE
               data, so treating it as destructive would mislead. */
            className="inline-flex h-[22px] shrink-0 items-stretch overflow-hidden rounded-[5px] border border-[color-mix(in_srgb,var(--rui-accent)_45%,transparent)] bg-accent-subtle text-[.75rem]"
          >
            <span className="flex items-center bg-[color-mix(in_srgb,var(--rui-accent)_16%,transparent)] px-[6px] text-[.625rem] font-bold uppercase tracking-[.05em] text-accent">
              {f.label}
            </span>
            <span className="flex max-w-[160px] items-center truncate px-[6px] text-body">
              {f.value}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                f.onClear();
              }}
              aria-label={`Clear ${f.label} filter`}
              className="grid w-[18px] cursor-pointer place-items-center border-l border-[color-mix(in_srgb,var(--rui-accent)_30%,transparent)] text-muted outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--rui-accent)_16%,transparent)] hover:text-accent focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}

        {searchable && (
          <input
            ref={inputRef}
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={facets.length ? "" : "Search…"}
            aria-label="Search all columns"
            className="min-w-[80px] flex-1 border-0 bg-transparent py-0.5 text-[.8125rem] text-body outline-none placeholder:text-faint"
          />
        )}
      </div>

      {trailing}
    </div>
  );
}
