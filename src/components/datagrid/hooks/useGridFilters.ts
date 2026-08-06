import { useCallback, useMemo, useState } from "react";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

import type { WithMeta } from "../types/column";
import type { FacetChip } from "../ui/FacetChips";
import type { GroupOption } from "../types/grouping";

type Params<TRow extends object, TForm extends object> = {
  columns: WithMeta<TRow, TForm>[];
  getColId: (c: WithMeta<TRow, TForm>) => string;
  initialSorting?: SortingState;
};

/** Search, per-column filters, sorting, and the facet chips that summarise them. */
export function useGridFilters<TRow extends object, TForm extends object>({
  columns,
  getColId,
  initialSorting,
}: Params<TRow, TForm>) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);

  const hasFilterableColumns = useMemo(
    () => columns.some((c) => c.meta?.filter),
    [columns]
  );

  const toggleFilters = useCallback(() => setShowFilters((v) => !v), []);

  const clearColumnFilter = useCallback(
    (id: string) => setColumnFilters((prev) => prev.filter((x) => x.id !== id)),
    []
  );

  /** One chip per active criterion: search first, then grouping, then column filters. */
  const buildFacetChips = useCallback(
    (activeGroupOption: GroupOption | undefined, onClearGroup: () => void) => {
      const labelOf = (id: string) => {
        const col = columns.find((c) => getColId(c) === id);
        const header = col?.header;
        return col?.meta?.label ?? (typeof header === "string" ? header : id);
      };
      const valueOf = (v: unknown): string => {
        if (Array.isArray(v)) return v.join(", ");
        if (typeof v === "boolean") return v ? "Yes" : "No";
        if (v && typeof v === "object") {
          const r = v as { from?: string; to?: string };
          return [r.from, r.to].filter(Boolean).join(" → ");
        }
        return String(v ?? "");
      };

      const chips: FacetChip[] = [];
      if (globalFilter.trim() !== "") {
        chips.push({
          id: "__search__",
          label: "Search",
          value: globalFilter,
          onClear: () => setGlobalFilter(""),
        });
      }
      if (activeGroupOption) {
        chips.push({
          id: "__group__",
          label: "Group",
          value: activeGroupOption.label,
          onClear: onClearGroup,
        });
      }
      for (const f of columnFilters) {
        chips.push({
          id: f.id,
          label: labelOf(f.id),
          value: valueOf(f.value),
          onClear: () => clearColumnFilter(f.id),
        });
      }
      return chips;
    },
    [columns, getColId, globalFilter, columnFilters, clearColumnFilter]
  );

  return {
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    sorting,
    setSorting,
    showFilters,
    toggleFilters,
    hasFilterableColumns,
    buildFacetChips,
  };
}
