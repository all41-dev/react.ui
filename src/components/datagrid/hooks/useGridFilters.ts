import { useCallback, useMemo, useState } from "react";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

import type { WithMeta } from "../types/column";
import type { FacetChip } from "../types/facets";
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

  /* Column filters only. The search term has its own input and the group-by its own
     radio, so folding either into "Clear all" would clear something the user can still
     see set elsewhere. */
  const clearAllFilters = useCallback(() => setColumnFilters([]), []);

  /**
   * One chip per active criterion: grouping first, then column filters.
   *
   * The global search term is not a chip. The chips now live inside the search field, so
   * a "Search: foo" pill would sit next to the input already showing `foo`.
   */
  const buildFacetChips = useCallback(
    (activeGroupOption: GroupOption | undefined, onClearGroup: () => void) => {
      const colOf = (id: string) => columns.find((c) => getColId(c) === id);

      const labelOf = (id: string) => {
        const col = colOf(id);
        const header = col?.header;
        return col?.meta?.label ?? (typeof header === "string" ? header : id);
      };

      /*
       * Read through the filter's own vocabulary: a select stores the option's `value`
       * ("active") while the control displays its `label` ("Active"), and a pill showing
       * the stored side would name the criterion differently from the control that set it.
       */
      const valueOf = (id: string, v: unknown): string => {
        const filter = colOf(id)?.meta?.filter;
        const optionLabel = (raw: unknown) => {
          if (filter?.type !== "select") return String(raw ?? "");
          const hit = filter.options.find((o) => String(o.value) === String(raw));
          return hit?.label ?? String(raw ?? "");
        };

        if (Array.isArray(v)) return v.map(optionLabel).join(", ");
        if (typeof v === "boolean") {
          const labels = filter?.type === "boolean" ? filter.labels : undefined;
          return v ? (labels?.true ?? "Yes") : (labels?.false ?? "No");
        }
        if (v && typeof v === "object") {
          const r = v as { from?: string; to?: string };
          return [r.from, r.to].filter(Boolean).join(" → ");
        }
        return optionLabel(v);
      };

      const chips: FacetChip[] = [];
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
          value: valueOf(f.id, f.value),
          onClear: () => clearColumnFilter(f.id),
        });
      }
      return chips;
    },
    [columns, getColId, columnFilters, clearColumnFilter]
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
    clearAllFilters,
    hasFilterableColumns,
    buildFacetChips,
  };
}
