import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";

export const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export type PaginationProp = {
  enabled?: boolean;
  pageSizeOptions?: number[];
  initialState?: Partial<PaginationState>;
  state?: PaginationState;
  onChange?: OnChangeFn<PaginationState>;
};

type Params = {
  pagination?: PaginationProp;
  /** Watched so a filter or sort change sends the user back to page 1. */
  columnFilters: ColumnFiltersState;
  globalFilter: string;
  sorting: SortingState;
};

export function useGridPagination({
  pagination: paginationProp,
  columnFilters,
  globalFilter,
  sorting,
}: Params) {
  const enabled = paginationProp?.enabled ?? true;

  const [uncontrolled, setUncontrolled] = useState<PaginationState>({
    pageIndex: paginationProp?.initialState?.pageIndex ?? 0,
    pageSize: paginationProp?.initialState?.pageSize ?? 10,
  });

  /*
   * Controlled requires BOTH halves. With `state` but no `onChange` every page change
   * writes to the unused uncontrolled atom while the grid keeps rendering the parent's
   * frozen state — the pager looks alive and does nothing, silently.
   */
  const hasControlledState = !!paginationProp?.state;
  const hasOnChange = !!paginationProp?.onChange;
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || warnedRef.current) return;
    if (!hasControlledState || hasOnChange) return;
    warnedRef.current = true;
    console.warn(
      "[DataGrid] `pagination.state` was given without `pagination.onChange`. " +
        "Controlled pagination needs both — the pager will render but never change page. " +
        "Pass `onChange`, or drop `state` to let the grid manage pagination itself."
    );
  }, [hasControlledState, hasOnChange]);

  const state = paginationProp?.state ?? uncontrolled;
  const onPaginationChange: OnChangeFn<PaginationState> =
    paginationProp?.onChange ?? setUncontrolled;

  /*
   * Filtering or sorting sends the user back to page 1, but only on a real change. The ref
   * is seeded with the current values so this can't fire on mount and overwrite a
   * controlled parent's initial pageIndex.
   */
  const prevRef = useRef({ columnFilters, globalFilter, sorting });
  useEffect(() => {
    if (!enabled) return;
    const prev = prevRef.current;
    if (
      prev.columnFilters === columnFilters &&
      prev.globalFilter === globalFilter &&
      prev.sorting === sorting
    )
      return;
    prevRef.current = { columnFilters, globalFilter, sorting };
    onPaginationChange((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [columnFilters, globalFilter, sorting, enabled, onPaginationChange]);

  const initialPageIndex = paginationProp?.initialState?.pageIndex ?? 0;
  const initialPageSize = paginationProp?.initialState?.pageSize ?? 10;

  /* Through `onPaginationChange`, so a controlled parent hears about it rather
     than being overruled by a write to the unused uncontrolled atom. */
  const reset = useCallback(
    () =>
      onPaginationChange({
        pageIndex: initialPageIndex,
        pageSize: initialPageSize,
      }),
    [onPaginationChange, initialPageIndex, initialPageSize]
  );

  return {
    enabled,
    state,
    onPaginationChange,
    pageSizeOptions: paginationProp?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS,
    reset,
    isDefault:
      !enabled ||
      (state.pageIndex === initialPageIndex &&
        state.pageSize === initialPageSize),
  };
}
