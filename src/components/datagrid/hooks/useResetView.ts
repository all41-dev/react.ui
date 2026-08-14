import { useCallback } from "react";

/** One part of the view: knows whether it is untouched and how to go back. */
type ResettablePart = { reset: () => void; isDefault: boolean };

type Parts = {
  columnPrefs: ResettablePart;
  filters: ResettablePart;
  grouping: ResettablePart;
  pagination: ResettablePart;
};

/**
 * "Reset view": the grid as it renders on a first visit.
 *
 * Each part answers for itself — whether it is untouched, and how to go back — so a new
 * piece of view state either joins this type or stays out of the reset on purpose.
 */
export function useResetView({
  columnPrefs,
  filters,
  grouping,
  pagination,
}: Parts): { resetView: () => void; viewIsDefault: boolean } {
  /* Lifted out of their bundles: the bundles are new objects every render, the callbacks
     inside them are not. */
  const { reset: resetPrefs } = columnPrefs;
  const { reset: resetFilters } = filters;
  const { reset: resetGrouping } = grouping;
  const { reset: resetPagination } = pagination;

  const resetView = useCallback(() => {
    resetPrefs();
    resetFilters();
    resetGrouping();
    resetPagination();
  }, [resetPrefs, resetFilters, resetGrouping, resetPagination]);

  const viewIsDefault =
    columnPrefs.isDefault &&
    filters.isDefault &&
    grouping.isDefault &&
    pagination.isDefault;

  return { resetView, viewIsDefault };
}
