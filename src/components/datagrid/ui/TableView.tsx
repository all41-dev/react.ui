import { type Row, type Table } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SkeletonRow, EmptyState, NoResultsState } from "./GridStates";
import { useContainerWidth } from "../hooks/useContainerWidth";
import { useElementHeight } from "../hooks/useElementHeight";
import { useColumnLayout } from "../hooks/useColumnLayout";
import { Colgroup } from "./table/Colgroup";
import { HeaderCell } from "./table/HeaderCell";
import { HeaderFilter } from "./table/HeaderFilter";
import { GroupHeaderRow } from "./table/GroupHeaderRow";
import { useMemo, type ReactNode } from "react";
import { DataRowFragment } from "./table/DataRowFragment";
import type { GroupBucket } from "../types/grouping";

type TableViewProps<TRow extends object> = {
  table: Table<TRow>;
  getId: (row: TRow) => string | number | undefined;
  isLoading: boolean;
  error: string | Error | null;
  /** Accessible name for the grid — the table had none at all. */
  label?: string;
  /** Renders the per-column filter row under the header (toolbar Filters toggle). */
  showFilters?: boolean;
  emptyLabel?: string;
  /** Checkbox-selected row ids (multi). Merged into the selected-row styling. */
  selectedRowIds?: ReadonlySet<string>;
  /** When present the body is grouped: header rows interleaved with each group's rows. */
  groups?: GroupBucket<Row<TRow>>[];
  collapsedGroups?: ReadonlySet<string>;
  onToggleGroup?: (key: string) => void;
  editingRowId?: string | number | undefined;
  inlineEditor?: ReactNode;
  isCreating?: boolean;
  selectedRowId?: string | number | undefined;
  onRowClick?: (row: TRow) => void;
  expandedRowIds?: ReadonlySet<string | number>;
  renderExpandedRow?: (row: TRow) => ReactNode;
  changedRowId?: string | number;
};

export function TableView<TRow extends object>({
  table,
  getId,
  isLoading,
  error,
  label,
  showFilters,
  emptyLabel,
  selectedRowIds,
  groups,
  collapsedGroups,
  onToggleGroup,
  editingRowId,
  inlineEditor,
  isCreating,
  selectedRowId,
  onRowClick,
  expandedRowIds,
  renderExpandedRow,
  changedRowId,
}: TableViewProps<TRow>) {
  const { ref: wrapperRef, width: containerW } =
    useContainerWidth<HTMLDivElement>();

  const { leafColsAll, lastDataCol, lastColWidth, tableW } = useColumnLayout(
    table,
    containerW
  );

  const allRows = table.getRowModel().rows;

  /*
   * Every colSpan in this table — skeletons, the virtualizer's padding rows, the empty
   * state, the expanded-row panel, the inline editor. It has to be the count of columns
   * actually RENDERED, so it comes from the table rather than from the consumer's
   * `columns` array: that array excludes the injected select column, may itself contain
   * an `__actions__` column that was already counted, and says nothing about column
   * visibility. Over-spanning cells stretch past the `<colgroup>` and shear the layout.
   */
  const leafColCount = table.getVisibleLeafColumns().length;

  /*
   * "Nothing here yet" and "nothing matches your filters" are different states with
   * different fixes, and neither is the unfiltered row array the parent passed down —
   * reading that meant filtering to zero rows suppressed the empty state entirely and
   * left a blank rectangle under the header.
   */
  const totalRowCount = table.getCoreRowModel().rows.length;
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const { columnFilters, globalFilter } = table.getState();
  const hasActiveFilters =
    columnFilters.length > 0 || String(globalFilter ?? "").trim() !== "";

  const clearFilters = () => {
    table.resetColumnFilters();
    table.setGlobalFilter("");
  };

  /*
   * One flat list so a single virtualizer covers both grouped and ungrouped bodies.
   * Grouped: a header item per bucket, followed by that bucket's rows unless collapsed.
   */
  type BodyItem =
    | { kind: "group"; group: GroupBucket<Row<TRow>> }
    | { kind: "row"; row: Row<TRow> };

  const items = useMemo<BodyItem[]>(() => {
    if (!groups) return allRows.map((row) => ({ kind: "row" as const, row }));
    const out: BodyItem[] = [];
    for (const group of groups) {
      out.push({ kind: "group", group });
      if (!collapsedGroups?.has(group.key)) {
        for (const row of group.rows) out.push({ kind: "row", row });
      }
    }
    return out;
  }, [groups, collapsedGroups, allRows]);

  /*
   * The scroll element is the wrapper div, but the virtualized rows start AFTER the
   * sticky `<thead>` — so every offset the virtualizer computes was shifted by the
   * header's height. `overscan: 10` hid it, but the window was wrong by ~34px (~70px
   * with the filter row shown) and grew with the header. `scrollMargin` is the
   * documented fix; measured rather than hard-coded because the filter row toggles.
   */
  const { ref: headRef, height: headerHeight } = useElementHeight<HTMLTableSectionElement>();

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => wrapperRef.current,
    // Spec heights: 40px data rows, 36px group headers.
    estimateSize: (i) => (items[i]?.kind === "group" ? 36 : 40),
    overscan: 10,
    scrollMargin: headerHeight,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  // getTotalSize() already nets out scrollMargin; `start`/`end` do not, so the padding
  // rows — which live in normal flow below the header — have to subtract it themselves.
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop =
    virtualItems.length > 0 ? virtualItems[0].start - headerHeight : 0;

  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - (virtualItems[virtualItems.length - 1].end - headerHeight)
      : 0;

  return (
    <>
      {/*
       * One scroll container at every breakpoint. Don't add a hidden mobile card list
       * here — mapping every row into one defeats the virtualizer. Small screens scroll
       * this table horizontally, and a consumer who wants cards passes `card`.
       */}
      <div
        ref={wrapperRef}
        className="relative isolate max-h-[70vh] w-full overflow-x-auto overflow-y-auto"
      >
        <table
          /*
           * `border-separate` with zero spacing, and it isn't cosmetic: a positioned cell
           * inside a collapsed-border table is undefined behaviour, and Chrome won't make
           * the sticky actions cell a containing block — so the floating pill lays out
           * from its static position, off the right edge of the scroll container. Note
           * that border spacing is ignored under `border-collapse` anyway.
           */
          className="table-fixed border-separate border-spacing-0"
          style={{ width: `${tableW}px` }}
          /*
           * `role="grid"` makes the `aria-selected` on each row valid ARIA — on a plain
           * table it is meaningless and assistive tech ignores it.
           *
           * The counts are the FILTERED totals, not what is mounted: the body is
           * virtualized and grouped, so the DOM holds a window of rows whose positions
           * would otherwise be announced as "row 3 of 12" when the user is at row 400.
           */
          role="grid"
          aria-label={label}
          aria-rowcount={filteredRowCount}
          aria-colcount={leafColCount}
        >
          <Colgroup
            leafColsAll={leafColsAll}
            lastDataCol={lastDataCol}
            lastColWidth={lastColWidth}
          />

          <thead ref={headRef} className="sticky top-0 z-1 bg-surface-inset">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <HeaderCell key={h.id} h={h} />
                ))}
              </tr>
            ))}
            {/* Filter row lives in thead so it stays sticky under the header. It sits on
                the CARD surface, not the inset one — the inset is reserved for the
                header above it, and stacking two insets erased the boundary. */}
            {showFilters && (
              /* Entry only — the row unmounts on close, so there is nothing to animate
                 out. Enough to show the row arriving rather than appearing instantly. */
              <tr className="animate-slide-down bg-surface-card">
                {table
                  .getHeaderGroups()
                  .at(-1)!
                  .headers.map((h) =>
                    h.isPlaceholder || h.column.id === "__actions__" ? (
                      <th key={h.id} className="!w-0 !p-0 border-none" aria-hidden="true" />
                    ) : (
                      <th
                        key={h.id}
                        className="h-9 border-b border-border-default px-2 text-left align-middle font-normal normal-case tracking-normal"
                      >
                        <HeaderFilter h={h} />
                      </th>
                    )
                  )}
              </tr>
            )}
          </thead>

          {isLoading && totalRowCount === 0 && (
            <tbody className="bg-surface-card">
              <SkeletonRow cols={leafColCount} />
              <SkeletonRow cols={leafColCount} />
              <SkeletonRow cols={leafColCount} />
            </tbody>
          )}

          {isCreating && inlineEditor && (
            <tbody className="border-b border-border-default">
              <tr>
                <td colSpan={leafColCount} className="h-auto overflow-hidden p-0">
                  <div className="animate-slide-down border-t border-[color-mix(in_srgb,var(--rui-accent)_45%,transparent)] bg-surface-inset">
                    {inlineEditor}
                  </div>
                </td>
              </tr>
            </tbody>
          )}

          {paddingTop > 0 && (
            <tbody>
              <tr>
                <td colSpan={leafColCount} style={{ height: `${paddingTop}px` }} />
              </tr>
            </tbody>
          )}

          {/* Rows stay mounted while loading. Gating them on `!isLoading` blanked the body
              on every refresh — the skeleton above only covers the first load, when there
              is nothing to keep — so the grid collapsed to header height and snapped back
              when the data returned. GridBody's scrim is what says "loading"; the rows
              underneath stay put, which is what CardsView already does. */}
          {virtualItems.map((virtualRow) => {
              const item = items[virtualRow.index];
              if (!item) return null;

              if (item.kind === "group") {
                return (
                  <tbody
                    key={`g:${item.group.key}`}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                  >
                    <GroupHeaderRow
                      group={item.group}
                      leafColumns={table.getVisibleLeafColumns()}
                      collapsed={collapsedGroups?.has(item.group.key) ?? false}
                      onToggle={() => onToggleGroup?.(item.group.key)}
                    />
                  </tbody>
                );
              }

              const r = item.row;
              const key = getId(r.original) ?? r.id;
              const isEditing =
                editingRowId !== undefined &&
                String(key) === String(editingRowId);
              const isSelected =
                (selectedRowId !== undefined &&
                  String(selectedRowId) === String(key)) ||
                (selectedRowIds?.has(String(key)) ?? false);
              const isExpanded = expandedRowIds?.has(key) ?? false;
              const isChanged =
                changedRowId !== undefined &&
                String(changedRowId) === String(key);

              return (
                /* No zebra striping — rows sit on the card surface, separated by the
                   cell hairline alone. */
                <tbody
                  key={String(key)}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                >
                  <DataRowFragment
                    row={r}
                    /* 1-based, and counted over the flat body list rather than the
                       mounted window — the virtualizer only keeps a slice in the DOM. */
                    ariaRowIndex={virtualRow.index + 1}
                    leafColCount={leafColCount}
                    isEditing={isEditing}
                    isSelected={isSelected}
                    isExpanded={isExpanded}
                    isChanged={isChanged}
                    inlineEditor={isEditing ? inlineEditor : undefined}
                    renderExpandedRow={renderExpandedRow}
                    onRowClick={onRowClick}
                  />
                </tbody>
              );
            })}

          {paddingBottom > 0 && (
            <tbody>
              <tr>
                <td colSpan={leafColCount} style={{ height: `${paddingBottom}px` }} />
              </tr>
            </tbody>
          )}

          {!isLoading && filteredRowCount === 0 && !error && (
            <tbody className="bg-surface-card">
              <tr>
                <td colSpan={leafColCount}>
                  {hasActiveFilters && totalRowCount > 0 ? (
                    <NoResultsState onClearFilters={clearFilters} />
                  ) : (
                    <EmptyState
                      title={emptyLabel ?? "No data"}
                      description="There are no items to display yet."
                    />
                  )}
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

    </>
  );
}
